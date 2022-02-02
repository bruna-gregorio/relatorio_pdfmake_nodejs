import express, { Request, Response } from "express"
import PdfPrinter from "pdfmake"
import { TableCell, TDocumentDefinitions } from "pdfmake/interfaces"
import fs from "fs"

import prismaClient from "./prisma"

const routes = express.Router()

routes.get("/products", async (request: Request, response: Response) => {
  const products = await prismaClient.product.findMany()
  return response.json(products)
})

routes.get("/products/report", async (request: Request, response: Response) => {
  const products = await prismaClient.product.findMany()

  const fonts = {
    Helvetica: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique"
    }
  }
  const printer = new PdfPrinter(fonts)

  const body = []

  const columnsTitle: TableCell[] = [
    { text: "ID", style: "id" },
    { text: "Description", style: "columnsTitle" },
    { text: "Price", style: "columnsTitle" },
    { text: "Quantity", style: "columnsTitle" }
  ]

  const columnsBody = new Array()

  columnsTitle.forEach((column) => columnsBody.push(column))
  body.push(columnsBody)

  for await (let product of products) {
    const rows = new Array()

    rows.push(product.id)
    rows.push(product.description)
    rows.push(`R$ ${product.price}`)
    rows.push(product.quantity)

    body.push(rows)
  }

  const docDefinitions: TDocumentDefinitions = {
    defaultStyle: { font: "Helvetica" },
    content: [
      {
        columns: [
          { text: "Relatório de Produtos", style: "header" },
          { text: "02/02/2022 12:30hs\n\n", style: "header" }
        ]
      },
      {
        table: {
          heights: function (row) {
            return 30
          },
          widths: ["auto", 200, 100, 70],
          body
        }
      }
    ],
    styles: {
      header: {
        fontSize: 16,
        bold: true,
        alignment: "center"
      },
      id: {
        fillColor: "#999",
        color: "#fff",
        alignment: "center",
        margin: 4
      },
      columnsTitle: {
        fontSize: 13,
        bold: true,
        fillColor: "#7159c1",
        color: "#fff",
        margin: 4
      }
    }
  }

  const pdfDoc = printer.createPdfKitDocument(docDefinitions)

  // pdfDoc.pipe(fs.createWriteStream("Relatorio.pdf"))

  const chunks = []

  pdfDoc.on("data", (chunk) => {
    chunks.push(chunk)
  })

  pdfDoc.end()

  pdfDoc.on("end", () => {
    const result = Buffer.concat(chunks)
    response.end(result)
  })
})

export { routes }