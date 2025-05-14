// src/generator.ts
import {
  Project,
  SourceFile,
  ClassDeclaration,
  MethodDeclaration,
  Decorator,
  SyntaxKind,
  Type,
  Node,
  ParameterDeclaration,
} from "ts-morph";
import * as path from "path";
import * as fs from "fs";
import {
  PostmanCollection,
  PostmanItem,
  PostmanRequest,
  PostmanHeader,
  PostmanBody,
  PostmanUrl,
  PostmanAuth,
} from "./types"; // Import PostmanAuth
import { v4 as uuidv4 } from "uuid";

const HTTP_METHODS_WITH_BODY = ["POST", "PUT", "PATCH"];
const KNOWN_AUTH_GUARD_NAMES = [
  "UserGuard",
  "AuthGuard",
  "JwtAuthGuard",
  "AuthenticatedGuard",
  "JwtStrategy",
]; // Add common guard names

function getDecoratorArgument(
  decorator: Decorator,
  index: number = 0
): string | undefined {
  const argument = decorator.getArguments()[index];
  if (argument && Node.isStringLiteral(argument)) {
    return argument.getLiteralValue();
  }
  return undefined;
}

function generateSampleJsonForType(
  type: Type,
  project: Project,
  recursionDepth = 0,
  maxRecursionDepth = 3
): any {
  // ... (implementation from previous response - no changes needed here for auth)
  if (recursionDepth > maxRecursionDepth) {
    return `// Max recursion depth reached for type ${type.getText()}`;
  }

  if (type.isString()) return "string";
  if (type.isNumber()) return 0;
  if (type.isBoolean()) return false;
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
    const sample: Record<string, any> = {};
    for (const prop of properties) {
      const propType = prop.getValueDeclaration()?.getType();
      if (propType) {
        sample[prop.getName()] = generateSampleJsonForType(
          propType,
          project,
          recursionDepth + 1
        );
      } else {
        sample[
          prop.getName()
        ] = `// Could not determine type for ${prop.getName()}`;
      }
    }
    return sample;
  }
  if (type.isClass()) {
    // Handle classes specifically, similar to objects
    const properties = type.getProperties();
    const sample: Record<string, any> = {};
    for (const prop of properties) {
      const declaration = prop.getValueDeclaration();
      if (declaration) {
        const propType = declaration.getType();
        sample[prop.getName()] = generateSampleJsonForType(
          propType,
          project,
          recursionDepth + 1
        );
      } else {
        sample[
          prop.getName()
        ] = `// Could not get declaration for ${prop.getName()}`;
      }
    }
    return sample;
  }

  const typeText = type.getText();
  if (typeText === "Date") return new Date().toISOString();
  if (typeText === "any" || typeText === "unknown") return "anyValue";

  const symbol = type.getSymbol() || type.getAliasSymbol();
  if (symbol) {
    const declarations = symbol.getDeclarations();
    if (declarations.length > 0) {
      const declaration = declarations[0];
      if (
        Node.isClassDeclaration(declaration) ||
        Node.isInterfaceDeclaration(declaration)
      ) {
        const obj: Record<string, any> = {};
        declaration.getProperties().forEach((prop) => {
          obj[prop.getName()] = generateSampleJsonForType(
            prop.getType(),
            project,
            recursionDepth + 1
          );
        });
        return obj;
      }
    }
  }
  return `// Unsupported type: ${typeText}`;
}

function getDtoInfo(
  method: MethodDeclaration,
  project: Project
): {
  bodyDtoType?: Type;
  queryParamTypes?: Record<string, Type>;
  pathParamTypes?: Record<string, Type>;
} {
  // ... (implementation from previous response - no changes needed here for auth)
  let bodyDtoType: Type | undefined;
  const queryParamTypes: Record<string, Type> = {};
  const pathParamTypes: Record<string, Type> = {};

  for (const param of method.getParameters()) {
    const bodyDecorator = param.getDecorator("Body");
    const queryDecorator = param.getDecorator("Query");
    const paramDecorator = param.getDecorator("Param");

    if (bodyDecorator) {
      bodyDtoType = param.getType();
    } else if (queryDecorator) {
      const paramName = getDecoratorArgument(queryDecorator) || param.getName();
      queryParamTypes[paramName] = param.getType();
    } else if (paramDecorator) {
      const paramName = getDecoratorArgument(paramDecorator) || param.getName();
      pathParamTypes[paramName] = param.getType();
    }
  }
  return { bodyDtoType, queryParamTypes, pathParamTypes };
}

function getGuardNamesFromDecorator(decoratorNode: Decorator): string[] {
  const guardNames: string[] = [];
  decoratorNode.getArguments().forEach((argNode) => {
    if (Node.isIdentifier(argNode)) {
      // e.g., @UseGuards(UserGuard)
      guardNames.push(argNode.getText());
    } else if (Node.isCallExpression(argNode)) {
      // e.g., @UseGuards(AuthGuard('jwt'))
      const expression = argNode.getExpression();
      if (Node.isIdentifier(expression)) {
        guardNames.push(expression.getText()); // Extracts "AuthGuard"
      }
    }
  });
  return guardNames;
}

function requiresAuth(node: ClassDeclaration | MethodDeclaration): boolean {
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

export function generatePostmanItemsFromSourceFile(
  classDeclaration: ClassDeclaration,
  project: Project
): PostmanItem[] {
  const items: PostmanItem[] = [];
  const controllerDecorator = classDeclaration.getDecorator("Controller");
  if (!controllerDecorator) return items;

  let controllerBasePath = getDecoratorArgument(controllerDecorator) || "";
  if (controllerBasePath.startsWith("/"))
    controllerBasePath = controllerBasePath.substring(1);

  // Check for auth guards at controller level
  const controllerLevelAuth = requiresAuth(classDeclaration);

  const methods = classDeclaration.getMethods();
  for (const method of methods) {
    let httpMethod: string | undefined;
    let routePath: string | undefined;
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
      if (httpMethod) break;
    }

    if (!httpMethod) continue;

    if (!routePath) {
      // If no route path is specified, use the method name as the path
      routePath = "/";
    }

    if (routePath.startsWith("/")) routePath = routePath.substring(1);
    const fullPath = [controllerBasePath, routePath].filter(Boolean).join("/");
    const fullPathParts = fullPath.split("/").filter(Boolean);

    const requestName = `${httpMethod} /${fullPath || ""} (${methodName})`;
    console.log(`  Found endpoint: ${requestName}`);

    const { bodyDtoType, queryParamTypes, pathParamTypes } = getDtoInfo(
      method,
      project
    );

    const postmanRequest: PostmanRequest = {
      method: httpMethod as PostmanRequest["method"],
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
        if (
          paramType.isObject() ||
          paramType.isInterface() ||
          paramType.isClass()
        ) {
          const sampleQueryDto = generateSampleJsonForType(paramType, project);
          if (typeof sampleQueryDto === "object" && sampleQueryDto !== null) {
            for (const [key, value] of Object.entries(sampleQueryDto)) {
              postmanRequest.url.query?.push({ key, value: String(value) });
            }
          }
        } else {
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
        pathParamDescription += `- \`${paramName}\`: ${paramType.getText()} (e.g., ${JSON.stringify(
          generateSampleJsonForType(paramType, project)
        )})\n`;
      }
    }
    postmanRequest.description = requestDescription + pathParamDescription;

    const requestItem: PostmanItem = {
      name: requestName,
      request: postmanRequest,
      // Description is now part of postmanRequest
    };
    items.push(requestItem);
  }
  return items;
}

export function generateCollection(
  projectPath: string,
  collectionName: string
): PostmanCollection {
  const project = new Project({
    tsConfigFilePath: path.join(projectPath, "tsconfig.json"),
  });
  project.addSourceFilesAtPaths(`${projectPath}/**/*.controller.ts`);

  const postmanCollection: PostmanCollection = {
    info: {
      _postman_id: uuidv4(),
      name: collectionName || path.basename(projectPath) + " API",
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
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

    const controllerFolder: PostmanItem = {
      name:
        featureFolderName.charAt(0).toUpperCase() + featureFolderName.slice(1),
      item: [],
      description: `Endpoints for the ${featureFolderName} feature`,
    };

    const classes = sourceFile.getClasses();
    for (const classDeclaration of classes) {
      const items = generatePostmanItemsFromSourceFile(
        classDeclaration,
        project
      );
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
