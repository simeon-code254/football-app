import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: never; // rows should wrap themselves in a Link if they need to navigate
};

export function DataTable<T>({ columns, rows, rowKey, emptyMessage = 'No results.' }: Props<T>) {
  if (!rows.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.header} className={col.className}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={rowKey(row)}>
            {columns.map((col) => (
              <TableCell key={col.header} className={col.className}>
                {col.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
