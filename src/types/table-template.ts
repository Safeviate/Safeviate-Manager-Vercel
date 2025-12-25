
export type Cell = {
  r: number;
  c: number;
  content: string;
  rowSpan: number;
  colSpan: number;
  hidden: boolean;
};

export type TableData = {
  rows: number;
  cols: number;
  cells: Cell[];
  colWidths: number[];
  rowHeights: number[];
};

export type TableTemplate = {
  id: string;
  name: string;
  tableData: TableData;
};
