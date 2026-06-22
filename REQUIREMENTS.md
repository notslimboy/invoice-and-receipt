# Invoice & Nota Microsite Requirements

## Overview

Build a simple microsite for creating two document types:

- Invoice
- Nota

The microsite should let users enter business/customer details, add multiple line items, manually input quantities and prices, and automatically calculate totals. Final output should be downloadable/exportable as an image.

## Target Devices

- Mobile-first.
- Tablet friendly.
- Desktop layout should stay centered and constrained, similar to the tablet layout.
- Avoid full-width desktop dashboard styling.
- Keep the UI clear, simple, and easy to use.

## UI & Design Direction

- Use shadcn/ui components.
- Keep the interface clean and practical.
- Prioritize clarity over complex interactions.
- Use a centered layout with comfortable spacing.
- Form fields should be easy to use on mobile.
- Preview area should be readable on tablet and desktop.

## Color Palette

Use the green palette from the provided reference image.

Suggested colors:

- `#f6fbf5`
- `#e7f4e2`
- `#c9e9c3`
- `#a6dba0`
- `#74c374`
- `#43aa60`
- `#238d48`
- `#005d2e`

## Main Features

### Document Mode

The microsite should support switching between:

- Invoice
- Nota

Each mode should show the relevant form fields and preview format.

### Logo

- User should be able to add/upload a logo.
- Logo should appear on both invoice and nota outputs.

### Item Input

Users should be able to:

- Add multiple items.
- Remove items.
- Enter item/menu name.
- Enter quantity manually.
- Enter unit price manually.
- Automatically calculate line total.
- Automatically calculate document total.

### Output

- Final output should be an image, preferably PNG.
- There should be a clear action to export/download the preview as an image.

## Invoice Requirements

### Format

- Invoice output should be landscape.
- Layout should look like a standard professional invoice.

### Required Content

- Logo.
- Business name and information.
- Invoice number.
- Invoice date.
- Customer/client information.
- Item table.
- Quantity.
- Unit price.
- Line total.
- Subtotal/total.
- Optional notes or payment information.

### Visual Style

- Clean and professional.
- More polished than the nota format.
- Should feel like a proper business invoice.
- Landscape composition should use horizontal space well.

## Nota Requirements

### Reference

The nota output should follow the attached `IMG_9824.HEIC` reference image.

### Format

- Nota output should be portrait.
- It should look like a printed physical nota/receipt form.

### Required Content

- Logo or business mark.
- Business name.
- Address and contact information.
- `NOTA No`.
- `Tanggal`.
- `Kepada YTH`.
- Item table.
- `Banyaknya`.
- `Nama Menu`.
- `Harga Satuan`.
- `Jumlah`.
- `TOTAL`.
- `Tanda Terima`.

### Visual Style

- Use strong table lines.
- Should resemble a printed paper nota.
- More form-like and utilitarian than the invoice.
- Keep the layout close to the reference image.

## Calculation Rules

For both invoice and nota:

- `Line Total = Quantity x Unit Price`.
- `Total = Sum of all line totals`.
- Calculations update automatically when quantity or price changes.
- Manual price input is required.

## Implementation Notes

- Build a real usable microsite, not a landing page.
- Main screen should immediately expose the invoice/nota creation workflow.
- Keep desktop centered with a tablet-like max width.
- Make sure the preview/export result matches the selected output orientation:
  - Invoice: landscape.
  - Nota: portrait.
