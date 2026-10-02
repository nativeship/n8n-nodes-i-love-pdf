"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ilovepdf = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const http_1 = require("../../shared/http");
function normalizeParameterValue(value) {
    if (value && typeof value === 'object' && 'value' in value)
        return value.value;
    return value;
}
function normalizeJsonValue(value, label, context, itemIndex) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed)
            return {};
        try {
            return JSON.parse(trimmed);
        }
        catch (error) {
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${label} must be valid JSON: ${error.message}`, { itemIndex });
        }
    }
    if (value === null || Array.isArray(value) || (value && typeof value === 'object') || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        return value;
    throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${label} must be valid JSON`, { itemIndex });
}
function validateBodyValue(value, contract, path, context, itemIndex) {
    var _a, _b, _c, _d, _e;
    if (value === undefined || value === '') {
        if (contract.required)
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} is required`, { itemIndex });
        return;
    }
    if (value === null) {
        if (contract.nullable)
            return;
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must not be null`, { itemIndex });
    }
    if ((_a = contract.alternatives) === null || _a === void 0 ? void 0 : _a.length) {
        selectAlternativeValue(value, contract, path, context, itemIndex);
        return;
    }
    if (contract.type === 'string' && typeof value !== 'string')
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a string`, { itemIndex });
    if (contract.type === 'boolean' && typeof value !== 'boolean')
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a boolean`, { itemIndex });
    if (contract.type === 'number' && typeof value !== 'number')
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a number`, { itemIndex });
    if (contract.type === 'integer' && (typeof value !== 'number' || !Number.isInteger(value)))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be an integer`, { itemIndex });
    if ((_b = contract.enum) === null || _b === void 0 ? void 0 : _b.length) {
        const enumValueMatches = (candidate) => candidate === value ||
            (candidate === null && value === 'null') ||
            (candidate === 'null' && value === null) ||
            Boolean(candidate && value && typeof candidate === 'object' && typeof value === 'object' && JSON.stringify(candidate) === JSON.stringify(value));
        const scalarEnum = contract.enum.every((candidate) => candidate === null || ['string', 'number', 'boolean'].includes(typeof candidate));
        const matches = contract.type === 'array' && Array.isArray(value) && scalarEnum
            ? value.every((item) => contract.enum.some((candidate) => candidate === item || (candidate === null && item === 'null') || (candidate === 'null' && item === null)))
            : contract.enum.some(enumValueMatches);
        if (!matches)
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be one of: ${contract.enum.join(', ')}`, { itemIndex });
    }
    if (contract.type === 'number' || contract.type === 'integer') {
        const numeric = value;
        if (contract.minValue !== undefined && numeric < contract.minValue)
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be at least ${contract.minValue}`, { itemIndex });
        if (contract.maxValue !== undefined && numeric > contract.maxValue)
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be at most ${contract.maxValue}`, { itemIndex });
    }
    if (contract.pattern && typeof value === 'string' && !new RegExp(contract.pattern).test(value))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must match ${contract.pattern}`, { itemIndex });
    if (contract.format === 'email' && typeof value === 'string' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(value))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be an email address`, { itemIndex });
    if ((contract.format === 'uri' || contract.format === 'url') && typeof value === 'string') {
        try {
            new URL(value);
        }
        catch {
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a URL`, { itemIndex });
        }
    }
    if (contract.format === 'uuid' && typeof value === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a UUID`, { itemIndex });
    if (contract.type === 'object') {
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a JSON object`, { itemIndex });
        const objectValue = value;
        for (const child of (_c = contract.fields) !== null && _c !== void 0 ? _c : [])
            validateBodyValue(objectValue[child.name], child, `${path}.${child.name}`, context, itemIndex);
        if (contract.additionalValue) {
            const known = new Set(((_d = contract.fields) !== null && _d !== void 0 ? _d : []).map((field) => field.name));
            for (const [key, childValue] of Object.entries(objectValue)) {
                if (!known.has(key)) {
                    if (((_e = contract.additionalValue.alternatives) === null || _e === void 0 ? void 0 : _e.length) && contract.additionalValue.representation === 'raw')
                        continue;
                    validateBodyValue(childValue, contract.additionalValue, `${path}.${key}`, context, itemIndex);
                }
            }
        }
    }
    if (contract.type === 'array') {
        if (!Array.isArray(value))
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a JSON array`, { itemIndex });
        if (contract.items)
            value.forEach((item, index) => validateBodyValue(item, contract.items, `${path}[${index}]`, context, itemIndex));
    }
}
function setBodyField(body, contract, value, context, itemIndex) {
    var _a, _b;
    const normalized = contract.type === 'object' || contract.type === 'array' || contract.type === 'alternative' || contract.representation === 'raw'
        ? normalizeJsonValue(value, (_a = contract.displayName) !== null && _a !== void 0 ? _a : contract.name, context, itemIndex)
        : normalizeParameterValue(value);
    const selected = ((_b = contract.alternatives) === null || _b === void 0 ? void 0 : _b.length) ? selectAlternativeValue(normalized, contract, contract.name, context, itemIndex) : normalized;
    validateBodyValue(selected, { ...contract, alternatives: undefined, composition: undefined }, contract.name, context, itemIndex);
    body[contract.name] = selected;
}
function selectAlternativeValue(value, contract, path, context, itemIndex) {
    var _a, _b, _c;
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must include an explicit schema alternative and value`, { itemIndex });
    const selectedName = String((_a = value.schemaAlternative) !== null && _a !== void 0 ? _a : '');
    const selected = ((_b = contract.alternatives) !== null && _b !== void 0 ? _b : []).find((alternative) => alternative.name === selectedName);
    if (!selected)
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} schema alternative must be one of: ${((_c = contract.alternatives) !== null && _c !== void 0 ? _c : []).map((alternative) => alternative.name).join(', ')}`, { itemIndex });
    const selectedValue = value.value;
    validateBodyValue(selectedValue, selected, path, context, itemIndex);
    return selectedValue;
}
function encodeFormValue(value) {
    if (value === null)
        return 'null';
    if (Array.isArray(value) || (value && typeof value === 'object'))
        return JSON.stringify(value);
    return String(value);
}
function toFormData(body) {
    const form = new FormData();
    for (const [key, value] of Object.entries(body))
        form.append(key, encodeFormValue(value));
    return form;
}
function selectResponseFields(value, fields) {
    if (fields.length === 0)
        return value;
    const selected = {};
    if (value.id !== undefined)
        selected.id = value.id;
    for (const field of fields)
        if (value[field] !== undefined)
            selected[field] = value[field];
    return selected;
}
function valueAtPath(value, path) {
    if (!path)
        return value;
    return path.split('.').filter(Boolean).reduce((current, segment) => {
        if (current === undefined || current === null)
            return undefined;
        if (Array.isArray(current))
            return current[Number(segment)];
        return current[segment];
    }, value);
}
class Ilovepdf {
    constructor() {
        this.description = {
            displayName: "iLovePDF",
            name: "ilovepdf",
            icon: {
                light: "file:ilovepdf.svg",
                dark: "file:ilovepdf.dark.svg"
            },
            group: [],
            version: [
                1
            ],
            subtitle: "={{((JSON.parse(\"\\u007b\\\"authentication\\\":\\u007b\\\"requestToken\\\":\\\"requestSignedTokenUsingPublicKey: authentication\\\"\\u007d,\\\"processing\\\":\\u007b\\\"downloadFile\\\":\\\"downloadProcessedOutput: processing\\\",\\\"processFiles\\\":\\\"processUploadedFiles: processing\\\",\\\"startTask\\\":\\\"startProcessingTask: processing\\\",\\\"uploadFile\\\":\\\"uploadFile: processing\\\"\\u007d,\\\"signature\\\":\\u007b\\\"createSignatureRequest\\\":\\\"createSignatureRequest: signature\\\",\\\"downloadSignedFiles\\\":\\\"downloadSignedFiles: signature\\\",\\\"getSignatureStatus\\\":\\\"retrieveSignatureStatus: signature\\\",\\\"listSignatures\\\":\\\"listSignatureRequests: signature\\\"\\u007d\\u007d\"))[$parameter[\"resource\"]] || {})[$parameter[\"operation\"]] || ($parameter[\"operation\"] + \": \" + $parameter[\"resource\"])}}",
            description: "Helps you merge, split, compress, convert, and edit PDF files.",
            documentationUrl: "https://api.ilovepdf.com/v1",
            hints: [
                {
                    message: "Operation \"listSignatures\" looks paginated, but no explicit safe Pagination Contract is available. The generated operation remains single-page until an explicit bounded Pagination Contract is provided.",
                    type: "warning",
                    location: "inputPane",
                    whenToDisplay: "always"
                }
            ],
            defaults: {
                name: "iLovePDF"
            },
            usableAsTool: true,
            inputs: [
                n8n_workflow_1.NodeConnectionTypes.Main
            ],
            outputs: [
                n8n_workflow_1.NodeConnectionTypes.Main
            ],
            credentials: [
                {
                    name: "ilovepdfApi",
                    required: true
                }
            ],
            properties: [
                {
                    displayName: "Resource",
                    name: "resource",
                    type: "options",
                    noDataExpression: true,
                    default: "authentication",
                    options: [
                        {
                            name: "Authentication",
                            value: "authentication"
                        },
                        {
                            name: "Processing",
                            value: "processing"
                        },
                        {
                            name: "Signature",
                            value: "signature"
                        }
                    ]
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "authentication"
                            ]
                        }
                    },
                    default: "requestToken",
                    options: [
                        {
                            name: "Request Signed Token Using Public Key",
                            value: "requestToken",
                            action: "Request signed token using public key authentication",
                            description: "Exchanges a project public key for a JWT bearer token used to authenticate API requests. authentication."
                        }
                    ]
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "authentication"
                            ],
                            operation: [
                                "requestToken"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Public Key",
                            name: "public_key",
                            type: "string",
                            default: "",
                            description: "Project public key used to request an access token"
                        }
                    ]
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "processing"
                            ]
                        }
                    },
                    default: "downloadFile",
                    options: [
                        {
                            name: "Download Processed Output",
                            value: "downloadFile",
                            action: "Download processed output processing",
                            description: "Downloads the output for a completed task. multiple output files are returned in an archive. processing."
                        },
                        {
                            name: "Process Uploaded Files",
                            value: "processFiles",
                            action: "Process uploaded files processing",
                            description: "Processes the files uploaded to the task with the selected pdf or image tool. processing."
                        },
                        {
                            name: "Start Processing Task",
                            value: "startTask",
                            action: "Start processing task",
                            description: "Starts a processing task for the selected tool and region, returning the server and task details needed for upload and processing"
                        },
                        {
                            name: "Upload File",
                            value: "uploadFile",
                            action: "Upload file processing",
                            description: "Uploads a source file to the task on the assigned server. use the server and task values returned when the task was started. processing."
                        }
                    ]
                },
                {
                    displayName: "Server",
                    name: "server",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Processing server that holds the task output",
                    displayOptions: {
                        show: {
                            resource: [
                                "processing"
                            ],
                            operation: [
                                "downloadFile"
                            ]
                        }
                    }
                },
                {
                    displayName: "Task",
                    name: "task",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Task whose processed output to download",
                    displayOptions: {
                        show: {
                            resource: [
                                "processing"
                            ],
                            operation: [
                                "downloadFile"
                            ]
                        }
                    }
                },
                {
                    displayName: "Server",
                    name: "server",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Processing server returned when the task was started",
                    displayOptions: {
                        show: {
                            resource: [
                                "processing"
                            ],
                            operation: [
                                "processFiles"
                            ]
                        }
                    }
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "processing"
                            ],
                            operation: [
                                "processFiles"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Files",
                            name: "files",
                            type: "json",
                            default: [],
                            description: "Files uploaded to the task for processing"
                        },
                        {
                            displayName: "Task",
                            name: "task",
                            type: "string",
                            default: "",
                            description: "Task identifier returned when the task was started"
                        },
                        {
                            displayName: "Tool",
                            name: "tool",
                            type: "string",
                            default: "",
                            description: "Pdf or image processing tool to run"
                        }
                    ]
                },
                {
                    displayName: "Tool",
                    name: "tool",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Pdf or image processing tool to run",
                    displayOptions: {
                        show: {
                            resource: [
                                "processing"
                            ],
                            operation: [
                                "startTask"
                            ]
                        }
                    }
                },
                {
                    displayName: "Region",
                    name: "region",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Region where the files will be processed",
                    displayOptions: {
                        show: {
                            resource: [
                                "processing"
                            ],
                            operation: [
                                "startTask"
                            ]
                        }
                    }
                },
                {
                    displayName: "Server",
                    name: "server",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Processing server returned when the task was started",
                    displayOptions: {
                        show: {
                            resource: [
                                "processing"
                            ],
                            operation: [
                                "uploadFile"
                            ]
                        }
                    }
                },
                {
                    displayName: "Task",
                    name: "task",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Task identifier returned when the task was started",
                    displayOptions: {
                        show: {
                            resource: [
                                "processing"
                            ],
                            operation: [
                                "uploadFile"
                            ]
                        }
                    }
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "processing"
                            ],
                            operation: [
                                "uploadFile"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "File",
                            name: "file",
                            type: "string",
                            default: "",
                            description: "Source file to upload for processing"
                        }
                    ]
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "signature"
                            ]
                        }
                    },
                    default: "createSignatureRequest",
                    options: [
                        {
                            name: "Create Signature Request",
                            value: "createSignatureRequest",
                            action: "Create signature request",
                            description: "Creates a signature request from an uploaded task and the supplied signers. the files array order determines the signing order."
                        },
                        {
                            name: "Download Signed Files",
                            value: "downloadSignedFiles",
                            action: "Download signed files signature",
                            description: "Downloads completed signed documents for the request. multiple signed files are returned in an archive. signature."
                        },
                        {
                            name: "List Signature Requests",
                            value: "listSignatures",
                            action: "List signature requests",
                            description: "Lists signature requests for the project. use page and per-page to retrieve results by page."
                        },
                        {
                            name: "Retrieve Signature Status",
                            value: "getSignatureStatus",
                            action: "Retrieve signature status",
                            description: "Retrieves signature request details and status using the requester token"
                        }
                    ]
                },
                {
                    displayName: "Server",
                    name: "server",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Processing server returned when the signature task was started",
                    displayOptions: {
                        show: {
                            resource: [
                                "signature"
                            ],
                            operation: [
                                "createSignatureRequest"
                            ]
                        }
                    }
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "signature"
                            ],
                            operation: [
                                "createSignatureRequest"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Files",
                            name: "files",
                            type: "json",
                            default: [],
                            description: "Uploaded documents to include in the signature request"
                        },
                        {
                            displayName: "Signers",
                            name: "signers",
                            type: "json",
                            default: [],
                            description: "People who need to sign the documents"
                        },
                        {
                            displayName: "Task",
                            name: "task",
                            type: "string",
                            default: "",
                            description: "Task identifier associated with the uploaded signature documents"
                        }
                    ]
                },
                {
                    displayName: "Server",
                    name: "server",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Processing server that holds the signed files",
                    displayOptions: {
                        show: {
                            resource: [
                                "signature"
                            ],
                            operation: [
                                "downloadSignedFiles"
                            ]
                        }
                    }
                },
                {
                    displayName: "Token",
                    name: "token",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Token identifying the signature request",
                    typeOptions: {
                        password: true
                    },
                    displayOptions: {
                        show: {
                            resource: [
                                "signature"
                            ],
                            operation: [
                                "downloadSignedFiles"
                            ]
                        }
                    }
                },
                {
                    displayName: "Token Requester",
                    name: "token_requester",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Requester token for the signature request",
                    typeOptions: {
                        password: true
                    },
                    displayOptions: {
                        show: {
                            resource: [
                                "signature"
                            ],
                            operation: [
                                "getSignatureStatus"
                            ]
                        }
                    }
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "signature"
                            ],
                            operation: [
                                "listSignatures"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Page",
                            name: "page",
                            type: "number",
                            default: 1,
                            description: "Page number of signature requests to return"
                        },
                        {
                            displayName: "Per Page",
                            name: "per-page",
                            type: "number",
                            default: 20,
                            description: "Number of signature requests to return per page"
                        }
                    ]
                }
            ]
        };
    }
    async execute() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const inputItems = this.getInputData();
        const output = [];
        for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex += 1) {
            const outputStart = output.length;
            let errorPlan = {};
            try {
                const operation = this.getNodeParameter('operation', itemIndex);
                const nodeVersion = this.getNode().typeVersion;
                let additionalFields = {};
                const nodeOptions = this.getNodeParameter('options', itemIndex, {});
                let retryContract = { mode: 'none', maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0 };
                let credentialApplications;
                let options;
                let pagination = { style: 'none', advancement: '', maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10 * 1024 * 1024, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                let responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                switch (operation) {
                    case "requestToken": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        const path = "/auth";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        if (additionalFields["public_key"] !== undefined)
                            setBodyField(body, { "name": "public_key", "displayName": "Public key", "description": "Project public key used to request an access token.", "type": "string" }, additionalFields["public_key"], this, itemIndex);
                        const serverBaseUrl = (0, http_1.resolveServerBaseUrl)(this, [{ "id": "documentServer1HttpsApiIlovepdfComV1", "url": "https://api.ilovepdf.com/v1", "kind": "selectable", "variables": [] }], "documentServer1HttpsApiIlovepdfComV1", nodeOptions, false);
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "ilovepdfApi", "type": "bearer" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["expires_in", "token"], simplified: ["expires_in", "token"] };
                        errorPlan = { "401": { "title": "Authentication credentials are missing or invalid" } };
                        break;
                    }
                    case "downloadFile": {
                        let path = "/{server}/v1/download/{task}";
                        const qs = {};
                        const body = {};
                        path = path.split("{server}").join(encodeURIComponent(String(this.getNodeParameter("server", itemIndex))));
                        path = path.split("{task}").join(encodeURIComponent(String(this.getNodeParameter("task", itemIndex))));
                        const serverBaseUrl = (0, http_1.resolveServerBaseUrl)(this, [{ "id": "documentServer1HttpsApiIlovepdfComV1", "url": "https://api.ilovepdf.com/v1", "kind": "selectable", "variables": [] }], "documentServer1HttpsApiIlovepdfComV1", nodeOptions, false);
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "ilovepdfApi", "type": "bearer" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "401": { "title": "Authentication credentials are missing or invalid" } };
                        break;
                    }
                    case "processFiles": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        let path = "/{server}/v1/process";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        path = path.split("{server}").join(encodeURIComponent(String(this.getNodeParameter("server", itemIndex))));
                        if (additionalFields["files"] !== undefined)
                            setBodyField(body, { "name": "files", "displayName": "Files", "description": "Files uploaded to the task for processing.", "type": "array", "representation": "raw", "items": { "name": "item", "displayName": "Item", "type": "object", "representation": "raw" } }, additionalFields["files"], this, itemIndex);
                        if (additionalFields["task"] !== undefined)
                            setBodyField(body, { "name": "task", "displayName": "Task", "description": "Task identifier returned when the task was started.", "type": "string" }, additionalFields["task"], this, itemIndex);
                        if (additionalFields["tool"] !== undefined)
                            setBodyField(body, { "name": "tool", "displayName": "Tool", "description": "PDF or image processing tool to run.", "type": "string" }, additionalFields["tool"], this, itemIndex);
                        const serverBaseUrl = (0, http_1.resolveServerBaseUrl)(this, [{ "id": "documentServer1HttpsApiIlovepdfComV1", "url": "https://api.ilovepdf.com/v1", "kind": "selectable", "variables": [] }], "documentServer1HttpsApiIlovepdfComV1", nodeOptions, false);
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "ilovepdfApi", "type": "bearer" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["download_filename", "filesize"], simplified: ["download_filename", "filesize"] };
                        errorPlan = { "401": { "title": "Authentication credentials are missing or invalid" } };
                        break;
                    }
                    case "startTask": {
                        let path = "/start/{tool}/{region}";
                        const qs = {};
                        const body = {};
                        path = path.split("{tool}").join(encodeURIComponent(String(this.getNodeParameter("tool", itemIndex))));
                        path = path.split("{region}").join(encodeURIComponent(String(this.getNodeParameter("region", itemIndex))));
                        const serverBaseUrl = (0, http_1.resolveServerBaseUrl)(this, [{ "id": "documentServer1HttpsApiIlovepdfComV1", "url": "https://api.ilovepdf.com/v1", "kind": "selectable", "variables": [] }], "documentServer1HttpsApiIlovepdfComV1", nodeOptions, false);
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "ilovepdfApi", "type": "bearer" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["server", "task"], simplified: ["server", "task"] };
                        errorPlan = { "401": { "title": "Authentication credentials are missing or invalid" } };
                        break;
                    }
                    case "uploadFile": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        let path = "/{server}/v1/upload";
                        const qs = {};
                        const body = {};
                        path = path.split("{server}").join(encodeURIComponent(String(this.getNodeParameter("server", itemIndex))));
                        qs["task"] = this.getNodeParameter("task", itemIndex);
                        if (additionalFields["file"] !== undefined)
                            setBodyField(body, { "name": "file", "displayName": "File", "description": "Source file to upload for processing.", "type": "string", "format": "binary" }, additionalFields["file"], this, itemIndex);
                        const serverBaseUrl = (0, http_1.resolveServerBaseUrl)(this, [{ "id": "documentServer1HttpsApiIlovepdfComV1", "url": "https://api.ilovepdf.com/v1", "kind": "selectable", "variables": [] }], "documentServer1HttpsApiIlovepdfComV1", nodeOptions, false);
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, body: toFormData(body), json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "ilovepdfApi", "type": "bearer" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["server_filename"], simplified: ["server_filename"] };
                        errorPlan = { "401": { "title": "Authentication credentials are missing or invalid" } };
                        break;
                    }
                    case "createSignatureRequest": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        let path = "/{server}/v1/signature";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        path = path.split("{server}").join(encodeURIComponent(String(this.getNodeParameter("server", itemIndex))));
                        if (additionalFields["files"] !== undefined)
                            setBodyField(body, { "name": "files", "displayName": "Files", "description": "Uploaded documents to include in the signature request.", "type": "array", "representation": "raw", "items": { "name": "item", "displayName": "Item", "type": "object", "representation": "raw" } }, additionalFields["files"], this, itemIndex);
                        if (additionalFields["signers"] !== undefined)
                            setBodyField(body, { "name": "signers", "displayName": "Signers", "description": "People who need to sign the documents.", "type": "array", "representation": "raw", "items": { "name": "item", "displayName": "Item", "type": "object", "representation": "raw" } }, additionalFields["signers"], this, itemIndex);
                        if (additionalFields["task"] !== undefined)
                            setBodyField(body, { "name": "task", "displayName": "Task", "description": "Task identifier associated with the uploaded signature documents.", "type": "string" }, additionalFields["task"], this, itemIndex);
                        const serverBaseUrl = (0, http_1.resolveServerBaseUrl)(this, [{ "id": "documentServer1HttpsApiIlovepdfComV1", "url": "https://api.ilovepdf.com/v1", "kind": "selectable", "variables": [] }], "documentServer1HttpsApiIlovepdfComV1", nodeOptions, false);
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "ilovepdfApi", "type": "bearer" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["token_requester"], simplified: ["token_requester"] };
                        errorPlan = { "401": { "title": "Authentication credentials are missing or invalid" } };
                        break;
                    }
                    case "downloadSignedFiles": {
                        let path = "/{server}/v1/signature/{token}/download-signed";
                        const qs = {};
                        const body = {};
                        path = path.split("{server}").join(encodeURIComponent(String(this.getNodeParameter("server", itemIndex))));
                        path = path.split("{token}").join(encodeURIComponent(String(this.getNodeParameter("token", itemIndex))));
                        const serverBaseUrl = (0, http_1.resolveServerBaseUrl)(this, [{ "id": "documentServer1HttpsApiIlovepdfComV1", "url": "https://api.ilovepdf.com/v1", "kind": "selectable", "variables": [] }], "documentServer1HttpsApiIlovepdfComV1", nodeOptions, false);
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "ilovepdfApi", "type": "bearer" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "401": { "title": "Authentication credentials are missing or invalid" } };
                        break;
                    }
                    case "getSignatureStatus": {
                        let path = "/v1/signature/requesterview/{token_requester}";
                        const qs = {};
                        const body = {};
                        path = path.split("{token_requester}").join(encodeURIComponent(String(this.getNodeParameter("token_requester", itemIndex))));
                        const serverBaseUrl = (0, http_1.resolveServerBaseUrl)(this, [{ "id": "documentServer1HttpsApiIlovepdfComV1", "url": "https://api.ilovepdf.com/v1", "kind": "selectable", "variables": [] }], "documentServer1HttpsApiIlovepdfComV1", nodeOptions, false);
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "ilovepdfApi", "type": "bearer" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["status"], simplified: ["status"] };
                        errorPlan = { "401": { "title": "Authentication credentials are missing or invalid" } };
                        break;
                    }
                    case "listSignatures": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        const path = "/v1/signature/list";
                        const qs = {};
                        const body = {};
                        if (additionalFields["page"] !== undefined)
                            qs["page"] = additionalFields["page"];
                        if (additionalFields["per-page"] !== undefined)
                            qs["per-page"] = additionalFields["per-page"];
                        const serverBaseUrl = (0, http_1.resolveServerBaseUrl)(this, [{ "id": "documentServer1HttpsApiIlovepdfComV1", "url": "https://api.ilovepdf.com/v1", "kind": "selectable", "variables": [] }], "documentServer1HttpsApiIlovepdfComV1", nodeOptions, false);
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "ilovepdfApi", "type": "bearer" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["signatures"], simplified: ["signatures"] };
                        errorPlan = { "401": { "title": "Authentication credentials are missing or invalid" } };
                        break;
                    }
                    default: throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported operation ${operation} for node version ${nodeVersion}`, { itemIndex });
                }
                const returnAll = pagination.style !== 'none' ? Boolean((_a = nodeOptions.returnAll) !== null && _a !== void 0 ? _a : false) : false;
                const resultLimit = pagination.style !== 'none' && !returnAll ? Number((_b = nodeOptions.resultLimit) !== null && _b !== void 0 ? _b : 50) : Math.min(pagination.maxItems, Number.POSITIVE_INFINITY);
                const pageStartTime = Date.now();
                const seenCursors = new Map();
                const seenPages = new Map();
                let page = 1;
                let offset = 0;
                let cursor;
                let pagesFetched = 0;
                let estimatedBytes = 0;
                let finished = false;
                while (!finished && output.length - outputStart < resultLimit && pagesFetched < pagination.maxPages) {
                    if (Date.now() - pageStartTime > pagination.maxElapsedMs)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Pagination elapsed-time budget was exceeded', { itemIndex });
                    const qs = options.qs;
                    if (pagination.limit && (pagesFetched > 0 || qs[pagination.limit] === undefined))
                        qs[pagination.limit] = Math.min(pagination.pageSize, resultLimit - (output.length - outputStart));
                    if (pagination.style === 'offset' && pagination.page)
                        qs[pagination.page] = offset;
                    if (pagination.style === 'pageNumber' && pagination.page)
                        qs[pagination.page] = page;
                    if (pagination.style === 'cursor' && pagination.cursor && cursor)
                        qs[pagination.cursor] = cursor;
                    const response = await (0, http_1.requestWithRetry)(this, options, credentialApplications, retryContract, itemIndex);
                    pagesFetched += 1;
                    const pageFingerprint = JSON.stringify(response);
                    const pageRepeats = ((_c = seenPages.get(pageFingerprint)) !== null && _c !== void 0 ? _c : 0) + 1;
                    seenPages.set(pageFingerprint, pageRepeats);
                    if (pageRepeats > pagination.repeatedPageLimit)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Pagination repeated-page budget was exceeded', { itemIndex });
                    estimatedBytes += pageFingerprint.length;
                    if (estimatedBytes > pagination.maxMemoryBytes)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Pagination memory budget was exceeded', { itemIndex });
                    if (responsePlan.binary) {
                        const binaryPayload = responsePlan.full ? ((_d = response.body) !== null && _d !== void 0 ? _d : response) : response;
                        const responseHeaders = (_e = (responsePlan.full ? response.headers : undefined)) !== null && _e !== void 0 ? _e : {};
                        const contentType = String((_f = responseHeaders['content-type']) !== null && _f !== void 0 ? _f : '').split(';')[0].trim() || 'application/octet-stream';
                        const binaryData = await this.helpers.prepareBinaryData(Buffer.from(binaryPayload), undefined, contentType);
                        output.push({ json: {}, binary: { data: binaryData }, pairedItem: { item: itemIndex } });
                        finished = true;
                        continue;
                    }
                    const normalizedResponse = responsePlan.full ? ((_g = response.body) !== null && _g !== void 0 ? _g : response) : response;
                    const envelopeValue = valueAtPath(normalizedResponse, responsePlan.envelopePath);
                    if (responsePlan.envelopePath && envelopeValue === undefined)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Response envelope path "${responsePlan.envelopePath}" was not found`, { itemIndex });
                    const envelope = (envelopeValue !== null && envelopeValue !== void 0 ? envelopeValue : normalizedResponse);
                    const itemPath = pagination.itemPath || responsePlan.itemPath;
                    const extractedItems = valueAtPath(envelope, itemPath);
                    if (itemPath && extractedItems === undefined)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Response item path "${itemPath}" was not found`, { itemIndex });
                    const deletedFallback = options.method === 'DELETE' && (normalizedResponse === undefined || normalizedResponse === null || normalizedResponse === '' ||
                        (typeof normalizedResponse === 'object' && !Array.isArray(normalizedResponse) && Object.keys(normalizedResponse).length === 0));
                    const values = deletedFallback
                        ? [{ deleted: true }]
                        : Array.isArray(extractedItems) ? extractedItems : Array.isArray(normalizedResponse) ? normalizedResponse : [extractedItems !== null && extractedItems !== void 0 ? extractedItems : envelope];
                    const outputMode = responsePlan.fields.length > 10 ? this.getNodeParameter('outputMode', itemIndex, 'simplified') : 'raw';
                    const selectedFields = outputMode === 'selected' ? this.getNodeParameter('selectedFields', itemIndex, []) : [];
                    for (const value of values) {
                        if (output.length - outputStart >= resultLimit)
                            break;
                        const fields = outputMode === 'simplified' ? responsePlan.simplified : outputMode === 'selected' ? selectedFields : [];
                        output.push({ json: selectResponseFields(value, fields), pairedItem: { item: itemIndex } });
                    }
                    if (!returnAll || pagination.style === 'none' || values.length === 0) {
                        finished = true;
                        continue;
                    }
                    if (pagination.hasMore && envelope[pagination.hasMore] === false) {
                        finished = true;
                        continue;
                    }
                    if (pagination.style === 'cursor') {
                        cursor = pagination.responseCursor ? valueAtPath(envelope, pagination.responseCursor) : undefined;
                        finished = !cursor;
                        if (cursor) {
                            const key = String(cursor);
                            const repeats = ((_h = seenCursors.get(key)) !== null && _h !== void 0 ? _h : 0) + 1;
                            seenCursors.set(key, repeats);
                            if (repeats > pagination.repeatedCursorLimit)
                                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Pagination repeated-cursor budget was exceeded', { itemIndex });
                        }
                    }
                    if (pagination.advancement === 'offsetByItems')
                        offset += values.length;
                    if (pagination.advancement === 'incrementPage')
                        page += 1;
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    output.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
                    continue;
                }
                if (error instanceof n8n_workflow_1.NodeApiError) {
                    const status = String((_l = (_j = error.httpCode) !== null && _j !== void 0 ? _j : (_k = error.cause) === null || _k === void 0 ? void 0 : _k.statusCode) !== null && _l !== void 0 ? _l : 'default');
                    const planned = (_m = errorPlan[status]) !== null && _m !== void 0 ? _m : errorPlan.default;
                    if (planned) {
                        const parameterHelp = planned.parameter ? `Check the '${planned.parameter}' parameter.` : undefined;
                        const description = [planned.recovery, parameterHelp].filter(Boolean).join(' ');
                        throw new n8n_workflow_1.NodeApiError(this.getNode(), error, { itemIndex, message: planned.title, description });
                    }
                }
                if (error instanceof n8n_workflow_1.NodeApiError)
                    throw new n8n_workflow_1.NodeApiError(this.getNode(), error, { itemIndex });
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, { itemIndex });
            }
        }
        return [output];
    }
}
exports.Ilovepdf = Ilovepdf;
//# sourceMappingURL=Ilovepdf.node.js.map