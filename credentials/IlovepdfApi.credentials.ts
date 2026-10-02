import { type IAuthenticateGeneric, type Icon, type ICredentialTestRequest, type ICredentialType, type INodeProperties } from "n8n-workflow";

// Generated with ts-morph
export class IlovepdfApi implements ICredentialType {
  name = "ilovepdfApi";
  displayName = "ILovePDF API";
  documentationUrl = "https://api.ilovepdf.com/v1";
  icon: Icon = {
        light: "file:../nodes/Ilovepdf/ilovepdf.svg",
        dark: "file:../nodes/Ilovepdf/ilovepdf.dark.svg"
    };
  properties: INodeProperties[] = [
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
  authenticate: IAuthenticateGeneric = {
        type: "generic",
        properties: {
            headers: {
                Authorization: "=Bearer {{$credentials.secret}}"
            }
        }
    };
  test: ICredentialTestRequest = {
        request: {
            baseURL: "https://api.ilovepdf.com/v1",
            url: "/v1/signature/list"
        }
    };
}
