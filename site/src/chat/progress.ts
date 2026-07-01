export interface FileProgress {
  name: string;
  loaded: number;
  total: number;
}

export interface AggregateProgress {
  progress: number;
  loaded: number;
  total: number;
  files: FileProgress[];
}

function shortFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

/**
 * transformers.js reports progress per-file, and a model load can involve
 * several files downloading concurrently (weights, tokenizer, configs) —
 * and for the vision worker, two separate from_pretrained() calls each with
 * their own file set. Tracking loaded/total per file ourselves, across the
 * whole init sequence, gives one true aggregate percentage instead of a bar
 * that jumps between each file's own 0-100% as they trade off reporting.
 */
export function createProgressAggregator() {
  const filesLoading = new Map<string, { loaded: number; total: number }>();

  return {
    update(file: string, loaded: number, total: number): AggregateProgress {
      filesLoading.set(file, { loaded, total });

      let loadedSum = 0;
      let totalSum = 0;
      const files: FileProgress[] = [];
      for (const [name, f] of filesLoading) {
        loadedSum += f.loaded;
        totalSum += f.total;
        files.push({ name: shortFileName(name), loaded: f.loaded, total: f.total });
      }

      return {
        progress: totalSum > 0 ? (loadedSum / totalSum) * 100 : 0,
        loaded: loadedSum,
        total: totalSum,
        files,
      };
    },
  };
}
