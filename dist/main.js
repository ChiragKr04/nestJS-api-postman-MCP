"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const path = __importStar(require("path"));
const generator_1 = require("./generator");
const ts_morph_1 = require("ts-morph");
// Create an MCP server
const server = new mcp_js_1.McpServer({
    name: "Nest-Js-MCP-Postman-Generator",
    description: "NestJS MCP to Postman Collection Generator",
    version: "1.0.0",
});
// Add an addition tool
// server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
//   content: [{ type: "text", text: String(a + b) }],
// }));
// Add a dynamic greeting resource
// server.resource(
//   "greeting",
//   new ResourceTemplate("greeting://{name}", { list: undefined }),
//   async (uri, { name }) => ({
//     contents: [
//       {
//         uri: uri.href,
//         text: `Hello, ${name}!`,
//       },
//     ],
//   })
// );
// Add a tool to convert NestJS resources to Postman collections
server.tool("convert-nest-js-resource-to-postman", 
/**
* This tool will take the path of the controller file
* and the collection name as input
* and will generate a Postman collection from the NestJS project
* The controller file path should be the path to the controller file
* The collection name will be the name in name.controller.ts and it should be the name of the Postman collection
* This resource will contain controller file/files
* it might have a folder ./dto which will contain the DTOs for the controller
*
* This will return a Postman collection
* The Postman collection will be in the format of the Postman collection v2.1
* The Postman collection will contain the following: (its a dummy but it looks like a real one)
*
* {
    "name": "App-charging",
    "item": [
      {
        "name": "POST /api/app-charging/start (startChargingApi)",
        "request": {
          "method": "POST",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "url": {
            "raw": "{{baseUrl}}/api/app-charging/start",
            "host": [
              "{{baseUrl}}"
            ],
            "path": [
              "api",
              "app-charging",
              "start"
            ],
            "query": []
          },
          "body": {
            "mode": "raw",
            "raw": "{\n  \"deviceId\": \"string\",\n  \"isOcpiCharging\": false,\n  \"connectorId\": \"string\",\n  \"amount\": 0,\n  \"redeemedCoins\": 0\n}"
          },
          "description": "Generated from startChargingApi in AppChargingController."
        }
      },
      {
        "name": "POST /api/app-charging/stop (stopChargingApi)",
        "request": {
          "method": "POST",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "url": {
            "raw": "{{baseUrl}}/api/app-charging/stop",
            "host": [
              "{{baseUrl}}"
            ],
            "path": [
              "api",
              "app-charging",
              "stop"
            ],
            "query": []
          },
          "body": {
            "mode": "raw",
            "raw": "{\n  \"deviceId\": \"string\"\n}"
          },
          "description": "Generated from stopChargingApi in AppChargingController."
        }
      },
      {
        "name": "POST /api/app-charging/on-started (onStartedApi)",
        "request": {
          "method": "POST",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "url": {
            "raw": "{{baseUrl}}/api/app-charging/on-started",
            "host": [
              "{{baseUrl}}"
            ],
            "path": [
              "api",
              "app-charging",
              "on-started"
            ],
            "query": []
          },
          "body": {
            "mode": "raw",
            "raw": "{\n  \"sessionId\": \"string\",\n  \"success\": false\n}"
          },
          "description": "Generated from onStartedApi in AppChargingController."
        }
      },
      {
        "name": "POST /api/app-charging/on-stopped (onStoppedApi)",
        "request": {
          "method": "POST",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "url": {
            "raw": "{{baseUrl}}/api/app-charging/on-stopped",
            "host": [
              "{{baseUrl}}"
            ],
            "path": [
              "api",
              "app-charging",
              "on-stopped"
            ],
            "query": []
          },
          "body": {
            "mode": "raw",
            "raw": "{\n  \"sessionId\": \"string\",\n  \"success\": false\n}"
          },
          "description": "Generated from onStoppedApi in AppChargingController."
        }
      }
    ],
    "description": "Endpoints for the app-charging feature"
  },
*/
{
    controllerFilePath: zod_1.z.string(),
    projectPath: zod_1.z.string(),
    collectionName: zod_1.z.string(),
}, async ({ controllerFilePath, projectPath, collectionName }) => {
    const project = new ts_morph_1.Project({
        tsConfigFilePath: path.join(projectPath, "tsconfig.json"),
    });
    project.addSourceFilesAtPaths(`${projectPath}/**/*.controller.ts`);
    const sourceFiles = project.getSourceFiles();
    const controllerFile = sourceFiles.find((file) => file.getFilePath().endsWith(controllerFilePath));
    if (!controllerFile) {
        return {
            content: [
                {
                    type: "text",
                    text: `Controller file ${controllerFilePath} not found in the project.`,
                },
            ],
        };
    }
    const controllerClasses = controllerFile.getClasses();
    if (controllerClasses.length === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: `Controller file ${controllerFilePath} does not contain any classes.`,
                },
            ],
        };
    }
    const classDeclaration = controllerClasses[0];
    const postmanCollection = (0, generator_1.generatePostmanItemsFromSourceFile)(classDeclaration, project);
    return {
        content: [
            { type: "text", text: JSON.stringify(postmanCollection, null, 2) },
        ],
    };
});
// Start receiving messages on stdin and sending messages on stdout
const transport = new stdio_js_1.StdioServerTransport();
// src/main.ts
// const program = new Command();
// program
//   .name("mcp-generator")
//   .description("NestJS MCP to Postman Collection Generator")
//   .version("0.1.0");
// program
//   .command("generate")
//   .description("Generate a Postman collection from a NestJS project")
//   .argument(
//     "<projectPath>",
//     "Path to the NestJS project root (containing tsconfig.json)"
//   )
//   .option(
//     "-o, --output <outputFile>",
//     "Output Postman collection JSON file path",
//     "postman_collection.json"
//   )
//   .option("-n, --name <collectionName>", "Name for the Postman collection")
//   .action((projectPath, options) => {
//     console.log(`Scanning NestJS project at: ${projectPath}`);
//     console.log(`Outputting to: ${options.output}`);
//     const absoluteProjectPath = path.resolve(projectPath);
//     if (
//       !fs.existsSync(absoluteProjectPath) ||
//       !fs.statSync(absoluteProjectPath).isDirectory()
//     ) {
//       console.error(
//         `Error: Project path "${absoluteProjectPath}" does not exist or is not a directory.`
//       );
//       process.exit(1);
//     }
//     const tsConfigPath = path.join(absoluteProjectPath, "tsconfig.json");
//     if (!fs.existsSync(tsConfigPath)) {
//       console.error(
//         `Error: tsconfig.json not found in "${absoluteProjectPath}". This tool requires it for proper type resolution.`
//       );
//       process.exit(1);
//     }
//     try {
//       const collectionName =
//         options.name || path.basename(absoluteProjectPath) + " API";
//       const postmanCollection = generateCollection(
//         absoluteProjectPath,
//         collectionName
//       );
//       const outputFilePath = path.resolve(options.output);
//       fs.writeFileSync(
//         outputFilePath,
//         JSON.stringify(postmanCollection, null, 2)
//       );
//       console.log(
//         `\nPostman collection generated successfully at: ${outputFilePath}`
//       );
//       console.log(`You can import this file into Postman.`);
//     } catch (error) {
//       console.error("\nAn error occurred during collection generation:");
//       console.error(error);
//       process.exit(1);
//     }
//   });
// program.parse(process.argv);
// if (!process.argv.slice(2).length) {
//   program.outputHelp();
// }
(async () => {
    await server.connect(transport);
})();
//# sourceMappingURL=main.js.map