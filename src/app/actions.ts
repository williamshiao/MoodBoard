import { fitSize, fitView, screenToWorld } from "../core/geometry";
import { newId } from "../core/id";
import { rotatedBounds } from "../core/transform";
import { type BoardItem, type Point, withTransformDefaults } from "../core/types";
import { extractSources, type TransferLike } from "../ingest/extract";
import { loadSource, measureImage } from "../ingest/load";
import { exportBoard, importBoard } from "../io/moodboardFile";
import { getBlob, loadBoard, pruneBlobs, putBlob, saveBoard } from "../storage/db";
import { blobFor, rememberBlob, srcFor } from "../storage/images";
import { useBoard } from "../store/board";
import { toast } from "../ui/toast";

/** Longest side of a newly added image, in screen pixels. */
const NEW_IMAGE_MAX = 360;

const viewport = () => ({ w: window.innerWidth, h: window.innerHeight });

/** Adds every image found in a drop or paste, centred on `screen` and fanned out slightly. */
export async function addFromTransfer(transfer: TransferLike, screen: Point) {
  const sources = extractSources(transfer);
  if (!sources.length) {
    toast("No image found in what was dropped");
    return;
  }
  const { view } = useBoard.getState();
  const at = screenToWorld(view, screen);
  const step = 30 / view.zoom;

  let linked = 0;
  for (const [i, source] of sources.entries()) {
    try {
      const loaded = await loadSource(source);
      const id = newId();
      const item: Pick<BoardItem, "id" | "source"> = {
        id,
        source: loaded.kind === "blob" ? { kind: "blob" } : { kind: "url", url: loaded.url },
      };
      if (loaded.kind === "blob") {
        rememberBlob(id, loaded.blob);
        await putBlob(id, loaded.blob);
      } else linked++;
      const size = fitSize(await measureImage(srcFor(item)), NEW_IMAGE_MAX / view.zoom);
      const cx = at.x + i * step;
      const cy = at.y + i * step;
      useBoard.getState().add({ ...item, ...size, x: cx - size.w / 2, y: cy - size.h / 2 });
    } catch (err) {
      console.warn(err);
      toast("Couldn't load that image");
    }
  }
  if (linked) toast("That site blocked copying, so the image is linked and needs the internet");
}

export function fitAll() {
  const { items, setView } = useBoard.getState();
  setView(fitView(Object.values(items).map(rotatedBounds), viewport()));
}

function download(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/zip" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportToFile() {
  const { items, view, settings } = useBoard.getState();
  download(await exportBoard(items, view, settings, blobFor), "board.moodboard");
}

export async function importFromFile(file: File) {
  try {
    const board = importBoard(new Uint8Array(await file.arrayBuffer()));
    for (const [id, blob] of board.blobs) {
      rememberBlob(id, blob);
      await putBlob(id, blob);
    }
    useBoard.getState().load(board.items, board.view, board.settings);
  } catch (err) {
    console.warn(err);
    toast("That file isn't a MoodBoard board");
  }
}

/** Restores the last board from this browser, then saves it whenever it changes. */
export async function restoreAndAutosave() {
  try {
    const saved = await loadBoard();
    if (saved) {
      const items: Record<string, BoardItem> = {};
      for (const stored of Object.values(saved.items)) {
        const item = withTransformDefaults(stored);
        if (item.source.kind === "blob") {
          const blob = await getBlob(item.id);
          if (!blob) continue;
          rememberBlob(item.id, blob);
        }
        items[item.id] = item;
      }
      useBoard.getState().load(items, saved.view, saved.settings);
      await pruneBlobs(new Set(Object.keys(items)));
    }
  } catch (err) {
    console.warn(err);
    toast("Couldn't restore the last board");
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  useBoard.subscribe((s, prev) => {
    if (s.items === prev.items && s.view === prev.view && s.settings === prev.settings) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const { items, view, settings } = useBoard.getState();
      saveBoard({ items, view, settings }).catch(console.warn);
    }, 250);
  });
}
