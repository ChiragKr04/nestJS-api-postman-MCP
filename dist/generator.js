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
exports.generatePostmanItemsFromSourceFile = generatePostmanItemsFromSourceFile;
exports.generateCollection = generateCollection;
// src/generator.ts
const ts_morph_1 = require("ts-morph");
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const HTTP_METHODS_WITH_BODY = ["POST", "PUT", "PATCH"];
const KNOWN_AUTH_GUARD_NAMES = [
    "UserGuard",
    "AuthGuard",
    "JwtAuthGuard",
    "AuthenticatedGuard",
    "JwtStrategy",
]; // Add common guard names
function getDecoratorArgument(decorator, index = 0) {
    const argument = decorator.getArguments()[index];
    if (argument && ts_morph_1.Node.isStringLiteral(argument)) {
        return argument.getLiteralValue();
    }
    return undefined;
}
function generateSampleJsonForType(type, project, recursionDepth = 0, maxRecursionDepth = 3) {
    // ... (implementation from previous response - no changes needed here for auth)
    if (recursionDepth > maxRecursionDepth) {
        return `// Max recursion depth reached for type ${type.getText()}`;
    }
    if (type.isString())
        return "string";
    if (type.isNumber())
        return 0;
    if (type.isBoolean())
        return false;
    if (type.isEnum()) {
        const enumMembers = type.getUnionTypes().filter((t) => t.isEnumLiteral());
        return enumMembers.length > 0
            ? enumMembers[0].getLiteralValue()
            : "enumValue";
    }
    if (type.isArray()) {
        const elementType = type.getArrayElementType();
        return elementType
            ? [generateSampleJsonForType(elementType, project, recursionDepth + 1)]
            : [];
    }
    if (type.isObject() || type.isInterface()) {
        // DTOs are often classes (objects)
        const properties = type.getProperties();
        const sample = {};
        for (const prop of properties) {
            const propType = prop.getValueDeclaration()?.getType();
            if (propType) {
                sample[prop.getName()] = generateSampleJsonForType(propType, project, recursionDepth + 1);
            }
            else {
                sample[prop.getName()] = `// Could not determine type for ${prop.getName()}`;
            }
        }
        return sample;
    }
    if (type.isClass()) {
        // Handle classes specifically, similar to objects
        const properties = type.getProperties();
        const sample = {};
        for (const prop of properties) {
            const declaration = prop.getValueDeclaration();
            if (declaration) {
                const propType = declaration.getType();
                sample[prop.getName()] = generateSampleJsonForType(propType, project, recursionDepth + 1);
            }
            else {
                sample[prop.getName()] = `// Could not get declaration for ${prop.getName()}`;
            }
        }
        return sample;
    }
    const typeText = type.getText();
    if (typeText === "Date")
        return new Date().toISOString();
    if (typeText === "any" || typeText === "unknown")
        return "anyValue";
    const symbol = type.getSymbol() || type.getAliasSymbol();
    if (symbol) {
        const declarations = symbol.getDeclarations();
        if (declarations.length > 0) {
            const declaration = declarations[0];
            if (ts_morph_1.Node.isClassDeclaration(declaration) ||
                ts_morph_1.Node.isInterfaceDeclaration(declaration)) {
                const obj = {};
                declaration.getProperties().forEach((prop) => {
                    obj[prop.getName()] = generateSampleJsonForType(prop.getType(), project, recursionDepth + 1);
                });
                return obj;
            }
        }
    }
    return `// Unsupported type: ${typeText}`;
}
function getDtoInfo(method, project) {
    // ... (implementation from previous response - no changes needed here for auth)
    let bodyDtoType;
    const queryParamTypes = {};
    const pathParamTypes = {};
    for (const param of method.getParameters()) {
        const bodyDecorator = param.getDecorator("Body");
        const queryDecorator = param.getDecorator("Query");
        const paramDecorator = param.getDecorator("Param");
        if (bodyDecorator) {
            bodyDtoType = param.getType();
        }
        else if (queryDecorator) {
            const paramName = getDecoratorArgument(queryDecorator) || param.getName();
            queryParamTypes[paramName] = param.getType();
        }
        else if (paramDecorator) {
            const paramName = getDecoratorArgument(paramDecorator) || param.getName();
            pathParamTypes[paramName] = param.getType();
        }
    }
    return { bodyDtoType, queryParamTypes, pathParamTypes };
}
function getGuardNamesFromDecorator(decoratorNode) {
    const guardNames = [];
    decoratorNode.getArguments().forEach((argNode) => {
        if (ts_morph_1.Node.isIdentifier(argNode)) {
            // e.g., @UseGuards(UserGuard)
            guardNames.push(argNode.getText());
        }
        else if (ts_morph_1.Node.isCallExpression(argNode)) {
            // e.g., @UseGuards(AuthGuard('jwt'))
            const expression = argNode.getExpression();
            if (ts_morph_1.Node.isIdentifier(expression)) {
                guardNames.push(expression.getText()); // Extracts "AuthGuard"
            }
        }
    });
    return guardNames;
}
function requiresAuth(node) {
    // Check for @UseGuards decorator
    const useGuardsDecorator = node.getDecorator("UseGuards");
    if (useGuardsDecorator) {
        const appliedGuards = getGuardNamesFromDecorator(useGuardsDecorator);
        for (const guardName of appliedGuards) {
            if (KNOWN_AUTH_GUARD_NAMES.includes(guardName)) {
                return true;
            }
        }
    }
    // Check for direct known auth guard decorators (e.g. @UserGuard())
    for (const knownGuard of KNOWN_AUTH_GUARD_NAMES) {
        if (node.getDecorator(knownGuard)) {
            return true;
        }
    }
    return false;
}
function generatePostmanItemsFromSourceFile(classDeclaration, project) {
    const items = [];
    const controllerDecorator = classDeclaration.getDecorator("Controller");
    if (!controllerDecorator)
        return items;
    let controllerBasePath = getDecoratorArgument(controllerDecorator) || "";
    if (controllerBasePath.startsWith("/"))
        controllerBasePath = controllerBasePath.substring(1);
    // Check for auth guards at controller level
    const controllerLevelAuth = requiresAuth(classDeclaration);
    const methods = classDeclaration.getMethods();
    for (const method of methods) {
        let httpMethod;
        let routePath;
        let methodName = method.getName();
        const routeDecorators = method.getDecorators();
        for (const decorator of routeDecorators) {
            const decoratorName = decorator.getName();
            switch (decoratorName) {
                case "Get":
                    httpMethod = "GET";
                    routePath = getDecoratorArgument(decorator) || "";
                    break;
                case "Post":
                    httpMethod = "POST";
                    routePath = getDecoratorArgument(decorator) || "";
                    break;
                case "Put":
                    httpMethod = "PUT";
                    routePath = getDecoratorArgument(decorator) || "";
                    break;
                case "Patch":
                    httpMethod = "PATCH";
                    routePath = getDecoratorArgument(decorator) || "";
                    break;
                case "Delete":
                    httpMethod = "DELETE";
                    routePath = getDecoratorArgument(decorator) || "";
                    break;
            }
            if (httpMethod)
                break;
        }
        if (!httpMethod)
            continue;
        if (!routePath) {
            // If no route path is specified, use the method name as the path
            routePath = "/";
        }
        if (routePath.startsWith("/"))
            routePath = routePath.substring(1);
        const fullPath = [controllerBasePath, routePath].filter(Boolean).join("/");
        const fullPathParts = fullPath.split("/").filter(Boolean);
        const requestName = `${httpMethod} /${fullPath || ""} (${methodName})`;
        console.log(`  Found endpoint: ${requestName}`);
        const { bodyDtoType, queryParamTypes, pathParamTypes } = getDtoInfo(method, project);
        const postmanRequest = {
            method: httpMethod,
            header: [],
            url: {
                raw: `{{baseUrl}}/${fullPath}`,
                host: ["{{baseUrl}}"],
                path: fullPathParts,
                query: [],
            },
        };
        let requestDescription = `Generated from ${methodName} in ${classDeclaration.getName()}.`;
        // Check for auth guards at method level
        const methodLevelAuth = requiresAuth(method);
        if (controllerLevelAuth || methodLevelAuth) {
            postmanRequest.auth = {
                type: "bearer",
                bearer: [{ key: "token", value: "{{bearerToken}}", type: "string" }],
            };
            requestDescription +=
                "\n\n**Authentication:** This endpoint likely requires a Bearer token. Ensure `{{bearerToken}}` collection variable is set or provide the token directly in the Authorization header.";
            // Add bearerToken to collection variables if not already present
            // if (!postmanCollection.variable?.find((v) => v.key === "bearerToken")) {
            //   if (!postmanCollection.variable) postmanCollection.variable = [];
            //   postmanCollection.variable.push({
            //     key: "bearerToken",
            //     value: "YOUR_ACCESS_TOKEN",
            //     type: "string",
            //   });
            // }
        }
        if (HTTP_METHODS_WITH_BODY.includes(httpMethod) && bodyDtoType) {
            postmanRequest.header.push({
                key: "Content-Type",
                value: "application/json",
            });
            const sampleBody = generateSampleJsonForType(bodyDtoType, project);
            postmanRequest.body = {
                mode: "raw",
                raw: JSON.stringify(sampleBody, null, 2),
            };
        }
        if (queryParamTypes && Object.keys(queryParamTypes).length > 0) {
            for (const [paramName, paramType] of Object.entries(queryParamTypes)) {
                if (paramType.isObject() ||
                    paramType.isInterface() ||
                    paramType.isClass()) {
                    const sampleQueryDto = generateSampleJsonForType(paramType, project);
                    if (typeof sampleQueryDto === "object" && sampleQueryDto !== null) {
                        for (const [key, value] of Object.entries(sampleQueryDto)) {
                            postmanRequest.url.query?.push({ key, value: String(value) });
                        }
                    }
                }
                else {
                    postmanRequest.url.query?.push({
                        key: paramName,
                        value: String(generateSampleJsonForType(paramType, project)),
                    });
                }
            }
            if (postmanRequest.url.query && postmanRequest.url.query.length > 0) {
                const queryString = postmanRequest.url.query
                    .map((q) => `${q.key}=${encodeURIComponent(q.value || "")}`)
                    .join("&");
                postmanRequest.url.raw = `{{baseUrl}}/${fullPath}?${queryString}`;
            }
        }
        let pathParamDescription = "";
        if (pathParamTypes && Object.keys(pathParamTypes).length > 0) {
            pathParamDescription += "\n\nPath Parameters:\n";
            for (const [paramName, paramType] of Object.entries(pathParamTypes)) {
                pathParamDescription += `- \`${paramName}\`: ${paramType.getText()} (e.g., ${JSON.stringify(generateSampleJsonForType(paramType, project))})\n`;
            }
        }
        postmanRequest.description = requestDescription + pathParamDescription;
        const requestItem = {
            name: requestName,
            request: postmanRequest,
            // Description is now part of postmanRequest
        };
        items.push(requestItem);
    }
    return items;
}
function generateCollection(projectPath, collectionName) {
    const project = new ts_morph_1.Project({
        tsConfigFilePath: path.join(projectPath, "tsconfig.json"),
    });
    project.addSourceFilesAtPaths(`${projectPath}/**/*.controller.ts`);
    const postmanCollection = {
        info: {
            _postman_id: (0, uuid_1.v4)(),
            name: collectionName || path.basename(projectPath) + " API",
            schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [],
        variable: [
            { key: "baseUrl", value: "http://localhost:3000", type: "string" },
        ],
    };
    const sourceFiles = project.getSourceFiles();
    for (const sourceFile of sourceFiles) {
        const filePath = sourceFile.getFilePath();
        console.log(`Processing controller: ${filePath}`);
        const controllerFileName = path.basename(filePath, ".controller.ts");
        const featureFolderName = controllerFileName;
        const controllerFolder = {
            name: featureFolderName.charAt(0).toUpperCase() + featureFolderName.slice(1),
            item: [],
            description: `Endpoints for the ${featureFolderName} feature`,
        };
        const classes = sourceFile.getClasses();
        for (const classDeclaration of classes) {
            const items = generatePostmanItemsFromSourceFile(classDeclaration, project);
            if (items.length > 0) {
                controllerFolder.item?.push(...items);
            }
        }
        if (controllerFolder.item && controllerFolder.item.length > 0) {
            postmanCollection.item.push(controllerFolder);
        }
    }
    return postmanCollection;
}
//# sourceMappingURL=generator.js.map