import { useCallback, useEffect, useRef, useState } from "react";
import styles from './use-table-cell-selection-manager.module.css';
import { UAParser } from 'ua-parser-js';
import { IUseTableCellSelectionManager } from "./use-table-cell-selection-manager.interface";
import { useAddEventListener } from "@wisdomstar94/react-add-event-listener";

const classNames = {
  targetTable: styles['table-draggable-target-table'],
  cellActive: styles['table-draggable-cell-active'],
  dragArea: styles['table-drag-area-box'],
  dragAreaBoxCommon: styles['table-drag-area-box-common'],
  htmlWindowScrollBlock: styles['html-window-scroll-block'],
  bodyWindowScrollBlock: styles['body-window-scroll-block'],
  scrollTargetScrollBlock: styles['scroll-target-scroll-block'],
};

const attrNames = {
  dataOriginIsActive: 'data-origin-isactive',
  dataDragNoneTarget: 'data-drag-none-target',
  dataRow: 'data-row',
  dataColumn: 'data-column',
  dataToggle: 'data-toggle',
  dataIsColumnTitle: 'data-is-column-title',
  dataIsRowTitle: 'data-is-row-title',
  dataAllToggle: 'data-all-toggle',
};

export const useTableCellSelectionManager = (props: IUseTableCellSelectionManager.HookProps) => {
  const {
    scrollTargetRef,
  } = props;

  const [cellActiveClassName, setCellActiveClassName] = useState(props.classNames?.cellActive ?? classNames.cellActive);
  useEffect(() => setCellActiveClassName(props.classNames?.cellActive ?? classNames.cellActive), [props.classNames?.cellActive]);

  const [dragAreaBoxClassName, setDragAreaBoxClassName] = useState(props.classNames?.dragArea ?? classNames.dragArea);
  useEffect(() => setDragAreaBoxClassName(props.classNames?.dragArea ?? classNames.dragArea), [props.classNames?.dragArea]);

  const isTablePressedRef = useRef<boolean>(false);
  const isDraggableEnableKeyPressedRef = useRef<boolean>(false);
  const tablePressedAbsoluteCoordinateRef = useRef<IUseTableCellSelectionManager.Coordinate>({ x: 0, y: 0 });
  const tableCurrentCursorAbsoluteCoordinateRef = useRef<IUseTableCellSelectionManager.Coordinate>({ x: 0, y: 0 });
  const currentActiveCellItemsRef = useRef<IUseTableCellSelectionManager.CellItem[]>([]);

  const latestScrollYRef = useRef<number>(0);
  const latestScrollXRef = useRef<number>(0);

  const latestScrollTargetYRef = useRef<number>(0);
  const latestScrollTargetXRef = useRef<number>(0);

  const pressTimeRef = useRef<number>(0);
  const unPressTimeRef = useRef<number>(0);

  const tableRowAndColumnsCount = useRef({ rowCount: 0, columnCount: 0, });

  const tableRefObservers = useRef<MutationObserver[]>([]);

  const removeDottedStrokeDragArea = useCallback(() => {
    const targetElement = document.querySelector<HTMLDivElement>('.' + classNames.dragAreaBoxCommon);
    if (targetElement !== null) {
      document.querySelector('body')?.removeChild(targetElement);
    }
  }, []);

  const getDragDirection = useCallback((): IUseTableCellSelectionManager.DragDirection => {
    const direction: IUseTableCellSelectionManager.DragDirection = {
      verticalDirection: 'top',
      horizontalDirection: 'right',
    };

    if (tableCurrentCursorAbsoluteCoordinateRef.current.y - tablePressedAbsoluteCoordinateRef.current.y < 0) {
      // top
      direction.verticalDirection = 'top';
    } else {
      // bottom
      direction.verticalDirection = 'bottom';
    }

    if (tableCurrentCursorAbsoluteCoordinateRef.current.x - tablePressedAbsoluteCoordinateRef.current.x < 0) {
      // left 
      direction.horizontalDirection = 'left';
    } else {
      // right
      direction.horizontalDirection = 'right';
    }

    return direction;
  }, []);

  const onPressTableColumnTitleTh = useCallback((event: MouseEvent | TouchEvent) => {
    if (event instanceof MouseEvent) {
      if (['mobile', 'tablet'].includes(new UAParser().getDevice().type + '')) {
        return;
      }
    } 

    event.stopPropagation();
    pressTimeRef.current = new Date().getTime();
  }, []);

  const getAbsoluteCoordinate = useCallback((event: MouseEvent | TouchEvent): IUseTableCellSelectionManager.Coordinate => {
    const coordinate: IUseTableCellSelectionManager.Coordinate = { x: 0, y: 0 };
    if (event instanceof MouseEvent) {
      coordinate.x = event.clientX;
      coordinate.y = event.clientY;
    } else {
      coordinate.x = event.touches[0].clientX;
      coordinate.y = event.touches[0].clientY;
    }
    return coordinate;
  }, []);

  const isTargetRowOrColumnAllChecked = useCallback((type: 'row' | 'column', value: string): boolean => {
    let result = true;
    props.tableRef.current?.querySelectorAll('td').forEach((element) => {
      if (element.getAttribute(attrNames.dataDragNoneTarget) === 'true') {
        return;
      }

      if (element.getAttribute(type === 'row' ? attrNames.dataRow : attrNames.dataColumn) === value) {
        if (!element.classList.contains(cellActiveClassName)) {
          result = false;
        }
      }
    });
    return result;
  }, [cellActiveClassName, props.tableRef]);

  const onUnPressTableRowTitleTh = useCallback((event: MouseEvent | TouchEvent) => {
    if (event instanceof MouseEvent) {
      if (['mobile', 'tablet'].includes(new UAParser().getDevice().type + '')) {
        return;
      }
    } 

    event.stopPropagation();
    unPressTimeRef.current = new Date().getTime();

    if (unPressTimeRef.current - pressTimeRef.current > 400) {
      return;
    }

    const targetElement = event.target as HTMLElement;
    const toggle = targetElement.getAttribute(attrNames.dataToggle);
    const row = targetElement.getAttribute(attrNames.dataRow);

    let applyToggle = 'on';
    if (toggle === 'on') {
      targetElement.setAttribute(attrNames.dataToggle, 'off');
      applyToggle = 'off';
    } else {
      targetElement.setAttribute(attrNames.dataToggle, 'on');
      applyToggle = 'on';
    }

    if (isTargetRowOrColumnAllChecked('row', row + '')) {
      targetElement.setAttribute(attrNames.dataToggle, 'off');
      applyToggle = 'off';
    }

    let index = 0;
    currentActiveCellItemsRef.current = [];
    props.tableRef.current?.querySelectorAll('td').forEach((element) => {
      if (element.getAttribute(attrNames.dataDragNoneTarget) === 'true') {
        index++;
        return;
      }

      if (element.classList.contains(cellActiveClassName)) {
        if (element.getAttribute(attrNames.dataRow) === row) {
          if (applyToggle === 'on') {
            element.setAttribute(attrNames.dataOriginIsActive, 'true');
            currentActiveCellItemsRef.current.push({ 
              element,
              rowIndex: Math.floor(index / tableRowAndColumnsCount.current.columnCount),
              columnIndex: index % tableRowAndColumnsCount.current.columnCount,
            });  
          } else {
            element.setAttribute(attrNames.dataOriginIsActive, 'false');
            element.classList.remove(cellActiveClassName);
          }
        } else {
          element.setAttribute(attrNames.dataOriginIsActive, 'true');
          currentActiveCellItemsRef.current.push({ 
            element,
            rowIndex: Math.floor(index / tableRowAndColumnsCount.current.columnCount),
            columnIndex: index % tableRowAndColumnsCount.current.columnCount,
          });  
        }
      } else if (element.getAttribute(attrNames.dataRow) === row) {
        if (applyToggle === 'on') {
          element.setAttribute(attrNames.dataOriginIsActive, 'true');
          element.classList.add(cellActiveClassName);
          currentActiveCellItemsRef.current.push({ 
            element,
            rowIndex: Math.floor(index / tableRowAndColumnsCount.current.columnCount),
            columnIndex: index % tableRowAndColumnsCount.current.columnCount,
          });  
        } else {
          element.setAttribute(attrNames.dataOriginIsActive, 'false');
          element.classList.remove(cellActiveClassName);
        }
      } else {
        element.setAttribute(attrNames.dataOriginIsActive, 'false');
      }
      index++;
    });
    props.onChangeTableActiveCell(currentActiveCellItemsRef.current);
  }, [cellActiveClassName, isTargetRowOrColumnAllChecked, props]);

  const isTwoLineCrossed = useCallback((line1: { p1: IUseTableCellSelectionManager.Coordinate, p2: IUseTableCellSelectionManager.Coordinate }, line2: { p1: IUseTableCellSelectionManager.Coordinate, p2: IUseTableCellSelectionManager.Coordinate }): boolean => {
    const p1 = line1.p1;
    const p2 = line1.p2;
    const p3 = line2.p1;
    const p4 = line2.p2;

    const sign1 = (p2.x-p1.x)*(p3.y-p1.y) - (p3.x-p1.x)*(p2.y-p1.y);
    const sign2 = (p2.x-p1.x)*(p4.y-p1.y) - (p4.x-p1.x)*(p2.y-p1.y);
    const sign3 = (p4.x-p3.x)*(p1.y-p3.y) - (p1.x-p3.x)*(p4.y-p3.y);
    const sign4 = (p4.x-p3.x)*(p2.y-p3.y) - (p2.x-p3.x)*(p4.y-p3.y);

    return sign1*sign2<0 && sign3*sign4<0;
  }, []);

  const onPressTableRowTitleTh = useCallback((event: MouseEvent | TouchEvent) => {
    if (event instanceof MouseEvent) {
      if (['mobile', 'tablet'].includes(new UAParser().getDevice().type + '')) {
        return;
      }
    } 

    event.stopPropagation();
    pressTimeRef.current = new Date().getTime();
  }, []);

  const allowWindowScroll = useCallback(() => {
    document.querySelector('html')?.classList.remove(classNames.htmlWindowScrollBlock);
    document.body.classList.remove(classNames.bodyWindowScrollBlock);
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('left');
    window.scrollTo({
      top: latestScrollYRef.current,
      left: latestScrollXRef.current,
    });

    if (scrollTargetRef !== undefined && scrollTargetRef.current !== null) {
      scrollTargetRef.current.classList.remove(classNames.scrollTargetScrollBlock);
      scrollTargetRef.current.style.removeProperty('top');
      scrollTargetRef.current.style.removeProperty('left');
      scrollTargetRef.current.scrollTo({
        top: latestScrollTargetYRef.current,
        left: latestScrollTargetXRef.current,
      });
    }
  }, [scrollTargetRef]);

  const isIncludeDragAreaCell = useCallback((element: HTMLTableCellElement) => {
    const rect = element.getBoundingClientRect();
    
    const elementStartDot: IUseTableCellSelectionManager.Coordinate = {
      x: rect.x,
      y: rect.y,
    };
    const elementEndDot: IUseTableCellSelectionManager.Coordinate = {
      x: rect.x + rect.width,
      y: rect.y + rect.height,
    };

    const elementTopLineStartDot: IUseTableCellSelectionManager.Coordinate = {
      x: rect.x,
      y: rect.y,
    };
    const elementTopLineEndDot: IUseTableCellSelectionManager.Coordinate = {
      x: rect.x + rect.width,
      y: rect.y,
    };

    const elementBottomLineStartDot: IUseTableCellSelectionManager.Coordinate = {
      x: rect.x,
      y: rect.y + rect.height,
    };
    const elementBottomLineEndDot: IUseTableCellSelectionManager.Coordinate = {
      x: rect.x + rect.width,
      y: rect.y + rect.height,
    };

    const elementLeftLineStartDot: IUseTableCellSelectionManager.Coordinate = {
      x: rect.x,
      y: rect.y,
    };
    const elementLeftLineEndDot: IUseTableCellSelectionManager.Coordinate = {
      x: rect.x,
      y: rect.y + rect.height,
    };

    const elementRightLineStartDot: IUseTableCellSelectionManager.Coordinate = {
      x: rect.x + rect.width,
      y: rect.y,
    };
    const elementRightLineEndDot: IUseTableCellSelectionManager.Coordinate = {
      x: rect.x + rect.width,
      y: rect.y + rect.height,
    };

    const direction = getDragDirection();

    let isHorizontalInclude = false;
    if (direction.horizontalDirection === 'left') {
      if (tableCurrentCursorAbsoluteCoordinateRef.current.x < elementStartDot.x && elementStartDot.x < tablePressedAbsoluteCoordinateRef.current.x) {
        isHorizontalInclude = true;
      } else if (tableCurrentCursorAbsoluteCoordinateRef.current.x < elementEndDot.x && elementEndDot.x < tablePressedAbsoluteCoordinateRef.current.x) {
        isHorizontalInclude = true;
      }
    } else {
      if (tablePressedAbsoluteCoordinateRef.current.x < elementStartDot.x && elementStartDot.x < tableCurrentCursorAbsoluteCoordinateRef.current.x) {
        isHorizontalInclude = true;
      } else if (tablePressedAbsoluteCoordinateRef.current.x < elementEndDot.x && elementEndDot.x < tableCurrentCursorAbsoluteCoordinateRef.current.x) {
        isHorizontalInclude = true;
      }
    }

    let isVerticalInclude = false;
    if (direction.verticalDirection === 'top') {
      if (tableCurrentCursorAbsoluteCoordinateRef.current.y < elementStartDot.y && elementStartDot.y < tablePressedAbsoluteCoordinateRef.current.y) {
        isVerticalInclude = true;
      } else if (tableCurrentCursorAbsoluteCoordinateRef.current.y < elementEndDot.y && elementEndDot.y < tablePressedAbsoluteCoordinateRef.current.y) {
        isVerticalInclude = true;
      }
    } else {
      if (tablePressedAbsoluteCoordinateRef.current.y < elementStartDot.y && elementStartDot.y < tableCurrentCursorAbsoluteCoordinateRef.current.y) {
        isVerticalInclude = true;
      } else if (tablePressedAbsoluteCoordinateRef.current.y < elementEndDot.y && elementEndDot.y < tableCurrentCursorAbsoluteCoordinateRef.current.y) {
        isVerticalInclude = true;
      }
    }

    if (isTwoLineCrossed({ p1: elementTopLineStartDot, p2: elementTopLineEndDot }, { p1: tableCurrentCursorAbsoluteCoordinateRef.current, p2: tablePressedAbsoluteCoordinateRef.current })) {
      isHorizontalInclude = true;
      isVerticalInclude = true;
    } else if (isTwoLineCrossed({ p1: elementBottomLineStartDot, p2: elementBottomLineEndDot }, { p1: tableCurrentCursorAbsoluteCoordinateRef.current, p2: tablePressedAbsoluteCoordinateRef.current })) {
      isHorizontalInclude = true;
      isVerticalInclude = true;
    } else if (isTwoLineCrossed({ p1: elementLeftLineStartDot, p2: elementLeftLineEndDot }, { p1: tableCurrentCursorAbsoluteCoordinateRef.current, p2: tablePressedAbsoluteCoordinateRef.current })) {
      isHorizontalInclude = true;
      isVerticalInclude = true;
    } else if (isTwoLineCrossed({ p1: elementRightLineStartDot, p2: elementRightLineEndDot }, { p1: tableCurrentCursorAbsoluteCoordinateRef.current, p2: tablePressedAbsoluteCoordinateRef.current })) {
      isHorizontalInclude = true;
      isVerticalInclude = true;
    }

    return isHorizontalInclude && isVerticalInclude;
  }, [getDragDirection, isTwoLineCrossed]);

  const drawDottedStrokeDragArea = useCallback(() => {
    let targetElement = document.querySelector<HTMLDivElement>('.' + classNames.dragAreaBoxCommon);
    if (targetElement === null) {
      targetElement = document.createElement('div');
      targetElement.classList.add(dragAreaBoxClassName);
      targetElement.classList.add(classNames.dragAreaBoxCommon);
      document.querySelector('body')?.appendChild(targetElement);
    }

    if (tableCurrentCursorAbsoluteCoordinateRef.current.x === 0) {
      return;
    }

    const direction = getDragDirection();
    const margin = 0;

    if (direction.horizontalDirection === 'left') {
      targetElement.style.left = (tableCurrentCursorAbsoluteCoordinateRef.current.x + (margin / 2)) + 'px';
      targetElement.style.width = (tablePressedAbsoluteCoordinateRef.current.x - tableCurrentCursorAbsoluteCoordinateRef.current.x - margin) + 'px';
    } else {
      targetElement.style.left = (tablePressedAbsoluteCoordinateRef.current.x - (margin / 2)) + 'px';
      targetElement.style.width = (tableCurrentCursorAbsoluteCoordinateRef.current.x - tablePressedAbsoluteCoordinateRef.current.x - margin) + 'px';
    }

    if (direction.verticalDirection === 'top') {
      targetElement.style.top = (tableCurrentCursorAbsoluteCoordinateRef.current.y + (margin / 2)) + 'px';
      targetElement.style.height = (tablePressedAbsoluteCoordinateRef.current.y - tableCurrentCursorAbsoluteCoordinateRef.current.y - margin) + 'px';
    } else {
      targetElement.style.top = (tablePressedAbsoluteCoordinateRef.current.y - (margin / 2)) + 'px';
      targetElement.style.height = (tableCurrentCursorAbsoluteCoordinateRef.current.y - tablePressedAbsoluteCoordinateRef.current.y - margin) + 'px';
    }
  }, [dragAreaBoxClassName, getDragDirection]);

  const denyWindowScroll = useCallback(() => {
    latestScrollYRef.current = window.scrollY;
    latestScrollXRef.current = window.scrollX;
    document.querySelector('html')?.classList.add(classNames.htmlWindowScrollBlock);
    document.body.classList.add(classNames.bodyWindowScrollBlock);
    document.body.style.top = `-${latestScrollYRef.current}px`;
    document.body.style.left = `-${latestScrollXRef.current}px`;

    if (scrollTargetRef !== undefined && scrollTargetRef.current !== null) {
      latestScrollTargetYRef.current = scrollTargetRef.current.scrollTop;
      latestScrollTargetXRef.current = scrollTargetRef.current.scrollLeft;
      scrollTargetRef.current.classList.add(classNames.scrollTargetScrollBlock);
      scrollTargetRef.current.style.top = `-${latestScrollTargetYRef.current}px`;
      scrollTargetRef.current.style.left = `-${latestScrollTargetXRef.current}px`;
    }
  }, [scrollTargetRef]);

  const onTableCursorMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (event instanceof MouseEvent) {
      if (['mobile', 'tablet'].includes(new UAParser().getDevice().type + '')) {
        return;
      }
    } 

    if (!isTablePressedRef.current) {
      return;
    }

    drawDottedStrokeDragArea();

    tableCurrentCursorAbsoluteCoordinateRef.current = getAbsoluteCoordinate(event);
    const targetElement = document.elementsFromPoint(tableCurrentCursorAbsoluteCoordinateRef.current.x, tableCurrentCursorAbsoluteCoordinateRef.current.y);

    let index = 0;
    const activeCellItems: IUseTableCellSelectionManager.CellItem[] = [];
    
    props.tableRef.current?.querySelectorAll('td').forEach((element) => {
      if (element.getAttribute(attrNames.dataDragNoneTarget) === 'true') {
        index++;
        return;
      }

      const result = isIncludeDragAreaCell(element);
      const originIsActive = element.getAttribute(attrNames.dataOriginIsActive);

      if (result || targetElement[0] === element) { 
        // 해당 td 요소가 드래그 좌표 범위 안에 포함되어 있다면
        if (originIsActive !== 'true') {
          element.classList.add(cellActiveClassName);
          activeCellItems.push({
            element,
            columnIndex: Math.floor(index / tableRowAndColumnsCount.current.columnCount),
            rowIndex: index % tableRowAndColumnsCount.current.columnCount,
          });
        } else {
          element.classList.remove(cellActiveClassName);
        }
      } else {
        if (originIsActive !== 'true') {
          element.classList.remove(cellActiveClassName);
        } else {
          element.classList.add(cellActiveClassName);
        }
      }

      index++;
    });
  }, [cellActiveClassName, drawDottedStrokeDragArea, getAbsoluteCoordinate, isIncludeDragAreaCell, props.tableRef]);

  const isAllActive = useCallback(() => {
    let isAllActive: boolean = true;
    props.tableRef.current?.querySelectorAll('td').forEach((element) => {
      if (!element.classList.contains(cellActiveClassName) && element.getAttribute(attrNames.dataIsRowTitle) !== 'true') {
        isAllActive = false;
      }
    });
    return isAllActive;
  }, [cellActiveClassName, props.tableRef]);

  const isAllUnActive = useCallback(() => {
    let isAllActive: boolean = true;
    props.tableRef.current?.querySelectorAll('td').forEach((element) => {
      if (element.classList.contains(cellActiveClassName)) {
        isAllActive = false;
      }
    });
    return isAllActive;
  }, [cellActiveClassName, props.tableRef]);

  const cellAllToggle = useCallback(() => {
    let currentAllToggle = props.tableRef.current?.getAttribute(attrNames.dataAllToggle);
    let nextToggle = currentAllToggle === 'true' ? 'false' : 'true';
    if (isAllActive()) {
      nextToggle = 'false';
    } else if (isAllUnActive()) {
      nextToggle = 'true';
    }

    if (nextToggle === 'false') {
      currentActiveCellItemsRef.current = [];
      props.tableRef.current?.querySelectorAll('td').forEach((element) => {
        element.classList.remove(cellActiveClassName);
        element.setAttribute(attrNames.dataOriginIsActive, 'false');
      });
      props.onChangeTableActiveCell(currentActiveCellItemsRef.current);
    } else {
      let index = 0;
      currentActiveCellItemsRef.current = [];
      props.tableRef.current?.querySelectorAll('td').forEach((element) => {
        if (element.getAttribute(attrNames.dataIsRowTitle) === 'true') {
          index++;
          return;
        }

        element.classList.add(cellActiveClassName);
        element.setAttribute(attrNames.dataOriginIsActive, 'true');
        currentActiveCellItemsRef.current.push({
          element,
          rowIndex: Math.floor(index / tableRowAndColumnsCount.current.columnCount),
          columnIndex: index % tableRowAndColumnsCount.current.columnCount,
        });
        index++;
      });
      props.onChangeTableActiveCell(currentActiveCellItemsRef.current);
    }
  }, [cellActiveClassName, isAllActive, isAllUnActive, props]);

  const onUnPressTableColumnTitleTh = useCallback((event: MouseEvent | TouchEvent) => {
    if (event instanceof MouseEvent) {
      if (['mobile', 'tablet'].includes(new UAParser().getDevice().type + '')) {
        return;
      }
    } 

    event.stopPropagation();
    unPressTimeRef.current = new Date().getTime();

    if (unPressTimeRef.current - pressTimeRef.current > 400) {
      return;
    }

    const targetElement = event.target as HTMLElement;
    if (props.tableRef.current?.querySelector('thead')?.querySelector('tr')?.querySelector('th') === targetElement) {
      cellAllToggle();
      return;
    }

    const toggle = targetElement.getAttribute(attrNames.dataToggle);
    const column = targetElement.getAttribute(attrNames.dataColumn);

    let applyToggle = 'on';
    if (toggle === 'on') {
      targetElement.setAttribute(attrNames.dataToggle, 'off');
      applyToggle = 'off';
    } else {
      targetElement.setAttribute(attrNames.dataToggle, 'on');
      applyToggle = 'on';
    }

    if (isTargetRowOrColumnAllChecked('column', column + '')) {
      targetElement.setAttribute(attrNames.dataToggle, 'off');
      applyToggle = 'off';
    }

    let index = 0;
    currentActiveCellItemsRef.current = [];
    props.tableRef.current?.querySelectorAll('td').forEach((element) => {
      if (element.classList.contains(cellActiveClassName)) {
        if (element.getAttribute(attrNames.dataColumn) === column) {
          if (applyToggle === 'on') {
            element.setAttribute(attrNames.dataOriginIsActive, 'true');
            currentActiveCellItemsRef.current.push({ 
              element,
              rowIndex: Math.floor(index / tableRowAndColumnsCount.current.columnCount),
              columnIndex: index % tableRowAndColumnsCount.current.columnCount,
            });  
          } else {
            element.setAttribute(attrNames.dataOriginIsActive, 'false');
            element.classList.remove(cellActiveClassName);
          }
        } else {
          element.setAttribute(attrNames.dataOriginIsActive, 'true');
          currentActiveCellItemsRef.current.push({ 
            element,
            rowIndex: Math.floor(index / tableRowAndColumnsCount.current.columnCount),
            columnIndex: index % tableRowAndColumnsCount.current.columnCount,
          });  
        }
      } else if (element.getAttribute(attrNames.dataColumn) === column) {
        if (applyToggle === 'on') {
          element.setAttribute(attrNames.dataOriginIsActive, 'true');
          element.classList.add(cellActiveClassName);
          currentActiveCellItemsRef.current.push({ 
            element,
            rowIndex: Math.floor(index / tableRowAndColumnsCount.current.columnCount),
            columnIndex: index % tableRowAndColumnsCount.current.columnCount,
          });  
        } else {
          element.setAttribute(attrNames.dataOriginIsActive, 'false');
          element.classList.remove(cellActiveClassName);
        }
      } else {
        element.setAttribute(attrNames.dataOriginIsActive, 'false');
      }
      index++;
    });
    props.onChangeTableActiveCell(currentActiveCellItemsRef.current);
  }, [cellActiveClassName, cellAllToggle, isTargetRowOrColumnAllChecked, props]);

  const onTablePress = useCallback((event: MouseEvent | TouchEvent) => {
    if (event instanceof MouseEvent) {
      if (['mobile', 'tablet'].includes(new UAParser().getDevice().type + '')) {
        return;
      }
    } 

    const targetElement = event.target as HTMLElement;
    if (targetElement.getAttribute(attrNames.dataIsColumnTitle) === 'true') {
      onPressTableColumnTitleTh(event);
      return;
    }

    if (targetElement.getAttribute(attrNames.dataIsRowTitle) === 'true') {
      onPressTableRowTitleTh(event);
      return;
    }

    isTablePressedRef.current = true;
    tablePressedAbsoluteCoordinateRef.current = getAbsoluteCoordinate(event);
    tableCurrentCursorAbsoluteCoordinateRef.current = getAbsoluteCoordinate(event);
    tableCurrentCursorAbsoluteCoordinateRef.current.x++;
    tableCurrentCursorAbsoluteCoordinateRef.current.y++;
    props.tableRef.current?.classList.add(classNames.targetTable);
    onTableCursorMove(event);

    denyWindowScroll();
  }, [denyWindowScroll, getAbsoluteCoordinate, onPressTableColumnTitleTh, onPressTableRowTitleTh, onTableCursorMove, props.tableRef]);

  const onTableUnPress = useCallback((event: MouseEvent | TouchEvent) => {
    if (event instanceof MouseEvent) {
      if (['mobile', 'tablet'].includes(new UAParser().getDevice().type + '')) {
        return;
      }
    } 

    const targetElement = event.target as HTMLElement;
    if (targetElement.getAttribute(attrNames.dataIsColumnTitle) === 'true') {
      onUnPressTableColumnTitleTh(event);
      return;
    }
      
    if (targetElement.getAttribute(attrNames.dataIsRowTitle) === 'true') {
      onUnPressTableRowTitleTh(event);
      return;
    }

    isTablePressedRef.current = false;
    props.tableRef.current?.classList.remove(classNames.targetTable);

    removeDottedStrokeDragArea();
    allowWindowScroll();

    let index = 0;
    currentActiveCellItemsRef.current = [];
    props.tableRef.current?.querySelectorAll('td').forEach((element) => {
      if (element.classList.contains(cellActiveClassName)) {
        element.setAttribute(attrNames.dataOriginIsActive, 'true');
        currentActiveCellItemsRef.current.push({ 
          element,
          rowIndex: Math.floor(index / tableRowAndColumnsCount.current.columnCount),
          columnIndex: index % tableRowAndColumnsCount.current.columnCount,
        });
      } else {
        element.setAttribute(attrNames.dataOriginIsActive, 'false');
      }
      index++;
    });
    props.onChangeTableActiveCell(currentActiveCellItemsRef.current);
  }, [allowWindowScroll, cellActiveClassName, onUnPressTableColumnTitleTh, onUnPressTableRowTitleTh, props, removeDottedStrokeDragArea]);

  const calculateRowAndColumns = useCallback(() => {
    const trs = props.tableRef.current?.querySelector('tbody')?.querySelectorAll('tr');
    if (trs === null || trs === undefined) {
      return;
    }

    const rowCount = trs.length;
    let columnCount = 0;

    let trIndex = 0;
    trs.forEach((tr) => {
      const count = tr.querySelectorAll('td').length;
      if (count > columnCount) {
        columnCount = count;
      }

      let tdColumnIndex = 0;
      tr.querySelectorAll('td').forEach((td) => {
        td.setAttribute(attrNames.dataRow, trIndex.toString());
        td.setAttribute(attrNames.dataColumn, tdColumnIndex.toString());
        tdColumnIndex++;
      });

      trIndex++;
    });

    const theadTrs = props.tableRef.current?.querySelector('thead')?.querySelectorAll('tr');
    theadTrs?.forEach((element) => {
      let tdColumnIndex = 0;
      element.querySelectorAll('th').forEach((th) => {
        th.setAttribute(attrNames.dataIsColumnTitle, 'true');
        th.setAttribute(attrNames.dataColumn, tdColumnIndex.toString());
        tdColumnIndex++;
      });
    });

    tableRowAndColumnsCount.current = {
      rowCount,
      columnCount,
    };
  }, [props.tableRef]);

  const attrActiveCellCheck = useCallback(() => {
    let index = 0;
    currentActiveCellItemsRef.current = [];
    props.tableRef.current?.querySelectorAll('td').forEach((element) => {
      if (element.getAttribute(attrNames.dataOriginIsActive) === 'true') {
        element.classList.add(cellActiveClassName);
        currentActiveCellItemsRef.current.push({ 
          element, 
          rowIndex: Math.floor(index / tableRowAndColumnsCount.current.columnCount),
          columnIndex: index % tableRowAndColumnsCount.current.columnCount,
        });
      } else {
        element.classList.remove(cellActiveClassName);
      }
      index++;
    });
  }, [cellActiveClassName, props.tableRef]);

  const init = useCallback(() => {
    calculateRowAndColumns();
    attrActiveCellCheck();
  }, [attrActiveCellCheck, calculateRowAndColumns]);

  const setActiveCellItems = useCallback((cellItems: IUseTableCellSelectionManager.CellItem[]) => {
    let index = 0;
    currentActiveCellItemsRef.current = [];
    props.tableRef.current?.querySelectorAll('td').forEach((element) => {
      const rowIndex = Number(element.getAttribute(attrNames.dataRow));
      const columnIndex = Number(element.getAttribute(attrNames.dataColumn));

      if (cellItems.find(k => k.columnIndex === columnIndex && k.rowIndex === rowIndex) !== undefined) {
        element.setAttribute(attrNames.dataOriginIsActive, 'true');
        element.classList.add(cellActiveClassName);
        currentActiveCellItemsRef.current.push({ 
          element, 
          rowIndex: Math.floor(index / tableRowAndColumnsCount.current.columnCount),
          columnIndex: index % tableRowAndColumnsCount.current.columnCount,
        });
      } else {
        element.setAttribute(attrNames.dataOriginIsActive, 'false');
        element.classList.remove(cellActiveClassName);
      }
      index++;
    });
    props.onChangeTableActiveCell(currentActiveCellItemsRef.current);
  }, [cellActiveClassName, props]);

  useAddEventListener({
    domEventRequiredInfo: {
      target: props.tableRef,
      eventName: 'mousedown',
      eventListener: onTablePress,  
    },
  });

  useAddEventListener({
    domEventRequiredInfo: {
      target: props.tableRef,
      eventName: 'touchstart',
      eventListener: onTablePress,  
    },
  });

  useAddEventListener({
    domEventRequiredInfo: {
      target: props.tableRef,
      eventName: 'mouseup',
      eventListener: onTableUnPress,
    },
  });

  useAddEventListener({
    domEventRequiredInfo: {
      target: props.tableRef,
      eventName: 'touchend',
      eventListener: onTableUnPress,
    },
  });

  useAddEventListener({
    domEventRequiredInfo: {
      target: props.tableRef,
      eventName: 'mousemove',
      eventListener: onTableCursorMove,
    },
  });

  useAddEventListener({
    domEventRequiredInfo: {
      target: props.tableRef,
      eventName: 'touchmove',
      eventListener: onTableCursorMove,
    },
  });

  useEffect(() => {
    const ob1 = new MutationObserver((_mutations) => {
      init();
    });
    if (props.tableRef.current !== null) {
      ob1.observe(props.tableRef.current, {
        childList: true,
        subtree: true,
      });
    }
    tableRefObservers.current.push(ob1);
    
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      tableRefObservers.current.forEach((item) => item.disconnect());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    init,
    setActiveCellItems,
  };
};