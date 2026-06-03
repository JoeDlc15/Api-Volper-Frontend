import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export const generarCotizacionPDF = (data) => {
    toast.loading("Generando documento digital...", { id: "pdf-toast" });

    try {
        // Inicializar jsPDF en formato A4 vertical con medidas en milímetros (210mm x 297mm)
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // 1. --- LOGOTIPO DE LA EMPRESA (Fallback vectorial) ---
        // Círculos concéntricos verdes (#22c55e)
        doc.setDrawColor(34, 197, 94);
        doc.setLineWidth(1.0);
        doc.circle(28, 25, 9, 'S'); // Radio 9
        doc.circle(28, 25, 6, 'S'); // Radio 6

        // Líneas del engranaje interior (Letra K)
        doc.setLineWidth(2.2);
        doc.line(25.5, 19, 25.5, 31);    // Línea vertical
        doc.line(25.5, 25, 30.5, 19);    // Diagonal superior
        doc.line(25.5, 25, 30.5, 31);    // Diagonal inferior

        // 2. --- CABECERA DE ALMACÉN ---
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(14.5);
        doc.setTextColor(220, 38, 38); // Rojo vibrante (#dc2626)
        doc.text("ALMACÉN - VOLPER SEAL S.A.C.", 50, 18);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(0, 0, 0); // Puro negro
        doc.text("REVISIÓN DE STOCK", 50, 24);

        // Dibujar dos checkboxes físicos vectoriales en la cabecera (Revisión y Alistar)
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.25);
        
        // Checkbox 1: REVISIÓN
        doc.setFillColor(255, 255, 255);
        doc.rect(50, 27.5, 3.2, 3.2, 'FD');
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        doc.text("REVISIÓN", 55.5, 30.2);

        // Checkbox 2: ALISTAR
        doc.setFillColor(255, 255, 255);
        doc.rect(80, 27.5, 3.2, 3.2, 'FD');
        doc.text("ALISTAR", 85.5, 30.2);

        // 3. --- RECUADRO DE COTIZACIÓN Y ENTREGA ---
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.6);
        doc.rect(138, 12, 57, 23, 'S');

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.text("COTIZACIÓN", 166.5, 18, { align: "center" });

        doc.setTextColor(220, 38, 38); // Rojo para destacar el número
        doc.text(data.number || 'COT-XXXX', 166.5, 23.5, { align: "center" });

        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        doc.text("ENTREGA: ____/____/____", 166.5, 30.5, { align: "center" });

        // 4. --- TABLA DE DATOS DEL CLIENTE ---
        const fechaEmision = data.date || '';
        const horaEmision = data.time || '12:00:00';

        autoTable(doc, {
            startY: 40,
            margin: { left: 15, right: 15 },
            theme: 'plain',
            styles: {
                fontSize: 8,
                cellPadding: 0.5,
                textColor: [0, 0, 0],
                font: 'Helvetica'
            },
            columnStyles: {
                0: { cellWidth: 20, fontStyle: 'bold' },
                1: { cellWidth: 80 },
                2: { cellWidth: 32, fontStyle: 'bold' },
                3: { cellWidth: 48 }
            },
            body: [
                ["Cliente", `: ${data.customerName}`, "Fecha de Emisión", `: ${fechaEmision}`],
                ["RUC", `: ${data.customerRuc || '-'}`, "Hora de Emisión", `: ${horaEmision}`],
                ["Dirección", `: ${data.address || '-'}`, "", ""],
                ["T. Pago", ": Contado", "", ""],
                ["Vendedor", `: ${data.sellerName || 'Ventas'}`, "", ""],
                ["Observación", `: ${data.description || '-'}`, "", ""]
            ]
        });

        // Línea divisora
        const dividerY = doc.lastAutoTable.finalY + 1.5;
        doc.setDrawColor(113, 128, 150);
        doc.setLineWidth(0.2);
        doc.line(15, dividerY, 195, dividerY);

        // 5. --- TABLA DE ÍTEMS ---
        const tableBody = (data.items || []).map(item => [
            item.quantity.toString(),
            "NIU",
            item.description || item.productId || "Producto sin nombre",
            "", // OK checkbox placeholder
            ""  // Observación
        ]);

        autoTable(doc, {
            startY: dividerY + 1.5,
            margin: { left: 15, right: 15 },
            head: [["CAN", "UNI", "PRODUCTO", "OK", "OBSERVACIÓN / FALTANTE"]],
            body: tableBody,
            theme: 'plain',
            headStyles: {
                fillColor: [13, 110, 33],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 10, halign: 'center' },
                2: { cellWidth: 90, halign: 'left' },
                3: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
                4: { cellWidth: 58, halign: 'center' }
            },
            styles: {
                fontSize: 8,
                cellPadding: 1.5,
                textColor: [0, 0, 0],
                valign: 'middle'
            },
            didDrawCell: function (cellData) {
                const doc = cellData.doc;
                if (cellData.section === 'body' && cellData.column.index === 3) {
                    const size = 3;
                    const x = cellData.cell.x + (cellData.cell.width - size) / 2;
                    const y = cellData.cell.y + (cellData.cell.height - size) / 2;

                    doc.setDrawColor(0, 0, 0);
                    doc.setLineWidth(0.2);
                    doc.setFillColor(255, 255, 255);
                    doc.rect(x, y, size, size, 'FD');
                }

                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.3);
                doc.line(
                    cellData.cell.x,
                    cellData.cell.y + cellData.cell.height,
                    cellData.cell.x + cellData.cell.width,
                    cellData.cell.y + cellData.cell.height
                );
            }
        });

        // 6. --- PIE DE PÁGINA ---
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.25);
            doc.line(15, 282, 195, 282);
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(0, 0, 0);
            doc.text(`Página ${i} de ${totalPages}`, 195, 287, { align: "right" });
        }

        // 7. --- RETORNAR BLOB URL PARA VISTA PREVIA ---
        const formattedDate = (data.date || '').replace(/-/g, '');
        const filename = formattedDate ? `${data.number}-${formattedDate}.pdf` : `${data.number}.pdf`;
        
        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        
        toast.success("¡Vista previa generada con éxito!", { id: "pdf-toast" });
        return { url: blobUrl, filename };

    } catch (err) {
        console.error("Error al generar PDF:", err);
        toast.error("Error al generar el PDF.", { id: "pdf-toast" });
        return null;
    }
};
