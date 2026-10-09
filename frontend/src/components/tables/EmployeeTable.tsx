import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
export function EmployeeTable({ rows, columns }: { rows: any[]; columns: any[] }) {
    const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });
    return (
        <table className="w-full text-sm">
            <thead>
                {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                        {hg.headers.map((h) => (
                            <th key={h.id} className="text-left p-2 border-b bg-gray-50 text-xs uppercase text-gray-500">
                                {flexRender(h.column.columnDef.header, h.getContext())}
                            </th >
                        ))
                        }
                    </tr >
                ))}
            </thead >
            <tbody>
                {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="p-2 border-b">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table >
    );
}