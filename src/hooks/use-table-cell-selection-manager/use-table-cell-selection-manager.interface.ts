export declare namespace IUseTableCellSelectionManager {
  export interface DragDirection {
    verticalDirection: 'top' | 'bottom';
    horizontalDirection: 'left' | 'right';
  }
  
  export interface Coordinate {
    x: number;
    y: number;
  }

  export interface CellItem {
    element?: HTMLTableCellElement | null;
    rowIndex: number;
    columnIndex: number;
  }
  
  // export interface ActiveCell {
  //   element: HTMLTableCellElement;
  //   position: [number, number];
  // }

  export interface ClassNames {
    cellActive?: string;
    dragArea?: string;
  }

  export interface HookProps {
    tableRef: { current: HTMLTableElement | null };
    onChangeTableActiveCell: (activeCellItems: CellItem[]) => void;
    classNames?: ClassNames;
    // cellActiveClassName?: string; 
    // dragAreaBoxClassName?: string;
    scrollTargetRef?: { current: HTMLElement | null };
  }
}