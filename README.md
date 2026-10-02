# iLovePDF n8n community node

Helps you merge, split, compress, convert, and edit PDF files.

Generated from OpenAPI 1.0.0 with template 1.1.0. Generated files are platform-managed and will be overwritten during regeneration.

## Authentication

Configure the generated bearer token credential in n8n before using the node.

## Supported operations

- `POST /auth` - Request signed token using public key
  - Retry Contract: none
  - Pagination Contract: none
- `GET /{server}/v1/download/{task}` - Download processed output
  - Retry Contract: none
  - Pagination Contract: none
- `POST /{server}/v1/process` - Process uploaded files
  - Retry Contract: none
  - Pagination Contract: none
- `GET /start/{tool}/{region}` - Start processing task
  - Retry Contract: none
  - Pagination Contract: none
- `POST /{server}/v1/upload` - Upload file
  - Retry Contract: none
  - Pagination Contract: none
- `POST /{server}/v1/signature` - Create signature request
  - Retry Contract: none
  - Pagination Contract: none
- `GET /{server}/v1/signature/{token}/download-signed` - Download signed files
  - Retry Contract: none
  - Pagination Contract: none
- `GET /v1/signature/requesterview/{token_requester}` - Retrieve signature status
  - Retry Contract: none
  - Pagination Contract: none
- `GET /v1/signature/list` - List signature requests
  - Retry Contract: none
  - Pagination Contract: none

## Usage

1. Install this community-node package in n8n.
2. Add the **iLovePDF** node to a workflow.
3. Select a resource and operation, configure its parameters, and execute the workflow.

## Example workflow

Connect **Manual Trigger** -> **iLovePDF** -> a destination node, select an operation, then run the workflow and inspect the returned items.

## Development

```sh
npm install
npm run build
npm run lint
npm run dev
```

`npm run dev` starts a local n8n development instance. Find the integration by its **iLovePDF** display name.
