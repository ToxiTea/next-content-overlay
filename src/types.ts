export type OverlayConfig = {
  version: 1;
  scanDirs: string[];
  extensions: string[];
  contentFile: string;
  mapFile: string;
  draftFile: string;
};

export type ContentMapEntry = {
  key: string;
  sourceFile: string;
  line: number;
  column: number;
  defaultValue: string;
};

