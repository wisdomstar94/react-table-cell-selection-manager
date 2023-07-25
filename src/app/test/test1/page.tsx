"use client"

import { useMemo, useRef, useState } from "react";
import styles from './page.module.css';
import { useTableCellSelectionManager } from "@/hooks/use-table-cell-selection-manager/use-table-cell-selection-manager.hook";

export default function Page() {
  const [rowCount, setRowCount] = useState<number>(16);
  const rowItems = useMemo(() => Array.from({ length: rowCount }), [rowCount]);

  const [columnCount, setColumnCount] = useState<number>(16);
  const columnItems = useMemo(() => Array.from({ length: columnCount }), [columnCount]);

  const tableRef = useRef<HTMLTableElement>(null);

  const tableCellSelectionManager = useTableCellSelectionManager({
    tableRef,
    onChangeTableActiveCell(activeCells) {
      console.log('@activeCells', activeCells); 
    },
  });
  
  return (
    <>
      <div className="w-full relative block">
        <table ref={tableRef} className={styles['table']}>
          <thead>
            <tr>
              <th>
                &nbsp;
              </th>
              {
                columnItems.map((item, index) => {
                  return (
                    <th key={index}>
                      { index }
                    </th>
                  );
                })
              }
            </tr>
          </thead>
          <tbody>
            {
              rowItems.map((rowItem, rowIndex) => {
                return (
                  <tr key={rowIndex}>
                    <th>
                      { rowIndex }
                    </th>
                    {
                      columnItems.map((columnItem, columnIndex) => {
                        return (
                          <td key={rowIndex + '_' + columnIndex}>
                            &nbsp;
                          </td>
                        );
                      })
                    }
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
      <div className="w-full fixed bottom-0 left-0">
        <button
          onClick={() => {
            tableCellSelectionManager.setActiveCellItems([
              { rowIndex: 0, columnIndex: 0, },
              { rowIndex: 0, columnIndex: 3, },
              { rowIndex: 0, columnIndex: 4, },
            ])
          }}>
          active cell 변경시키기
        </button>
      </div>
    </>
  );
}
