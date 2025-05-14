// src/types.ts

export interface PostmanAuthVariable {
  key: string;
  value: string | any; // Can be a variable like {{bearerToken}}
  type: string; // e.g., "string"
}

export interface PostmanAuth {
  type:
    | "bearer"
    | "basic"
    | "apikey"
    | "awsv4"
    | "edgegrid"
    | "hawk"
    | "noauth"
    | "ntlm"
    | "oauth1"
    | "oauth2";
  bearer?: PostmanAuthVariable[];
  // We'll focus on bearer, but other types can be added
  // basic?: PostmanAuthVariable[];
  // apikey?: PostmanAuthVariable[];
}

export interface PostmanRequest {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
  header: PostmanHeader[];
  body?: PostmanBody;
  url: PostmanUrl;
  description?: string;
  auth?: PostmanAuth; // Added for authentication details
}

export interface PostmanUrl {
  raw: string;
  host?: string[];
  path: string[];
  query?: { key: string; value: string | null }[];
}

export interface PostmanHeader {
  key: string;
  value: string;
  type?: string;
}

export interface PostmanBody {
  mode: "raw" | "formdata" | "urlencoded" | "file";
  raw?: string;
  // Add other modes if needed
}

export interface PostmanRequest {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
  header: PostmanHeader[];
  body?: PostmanBody;
  url: PostmanUrl;
  description?: string;
}

export interface PostmanItem {
  name: string;
  item?: PostmanItem[]; // For folders
  request?: PostmanRequest;
  description?: string;
}

export interface PostmanCollection {
  info: {
    _postman_id: string;
    name: string;
    schema: string;
    description?: string;
  };
  item: PostmanItem[];
  variable?: { key: string; value: string; type?: string }[];
}
