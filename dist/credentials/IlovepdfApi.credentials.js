"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IlovepdfApi = void 0;
class IlovepdfApi {
    constructor() {
        this.name = "ilovepdfApi";
        this.displayName = "ILovePDF API";
        this.documentationUrl = "https://api.ilovepdf.com/v1";
        this.icon = {
            light: "file:../nodes/Ilovepdf/ilovepdf.svg",
            dark: "file:../nodes/Ilovepdf/ilovepdf.dark.svg"
        };
        this.properties = [
            {
                displayName: "Access Token",
                name: "secret",
                type: "string",
                typeOptions: {
                    password: true
                },
                default: "",
                required: true
            }
        ];
        this.authenticate = {
            type: "generic",
            properties: {
                headers: {
                    Authorization: "=Bearer {{$credentials.secret}}"
                }
            }
        };
        this.test = {
            request: {
                baseURL: "https://api.ilovepdf.com/v1",
                url: "/v1/signature/list"
            }
        };
    }
}
exports.IlovepdfApi = IlovepdfApi;
//# sourceMappingURL=IlovepdfApi.credentials.js.map