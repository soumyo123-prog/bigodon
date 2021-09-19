import { ExpressionStatement, Statement, TemplateStatement } from "../parser/statements";
import { deepCloneNullPrototype } from "../utils";
import { runBlock } from "./block";
import { runHelperExpression } from "./helper";
import { runPathExpression } from "./path-expression";

export type LiteralValue = string | number | boolean | null | undefined | object;

const MIN_VERSION = 1;
const MAX_VERSION = 2;

export async function run(ast: TemplateStatement,
                          context: object = {},
                          extraHelpers: Map<string, Function>): Promise<string> {
    if(ast.version < MIN_VERSION || ast.version > MAX_VERSION) {
        throw new Error(`Unsupported AST version ${ast.version}, parse it again to generate a new AST`);
    }

    const ctx = deepCloneNullPrototype(context);
    return await runStatements(ast.statements, ctx, extraHelpers);
}

export async function runStatements(statements: Statement[],
                                       context: object,
                                  extraHelpers: Map<string, Function>): Promise<string> {
    let result = '';

    for(const statement of statements) {
        const stmtResult = await runStatement(statement, context, extraHelpers);
        if(stmtResult === null || typeof stmtResult === 'undefined') {
            continue;
        }
        result += String(stmtResult);
    }

    return result;
}

export async function runStatement(statement: Statement,
                                     context: object,
                                extraHelpers: Map<string, Function>): Promise<LiteralValue> {
    switch(statement.type) {
        case 'TEXT':
            return statement.value;
        case 'COMMENT':
            return null;
        case 'LITERAL':
            return statement.value;
        case 'MUSTACHE':
            return await runStatement(statement.expression, context, extraHelpers);
        case 'EXPRESSION':
            return await runExpression(statement, context, extraHelpers);
        case 'BLOCK':
            return await runBlock(statement, context, extraHelpers);
        default:
            // TODO track warn unsupported statement type
            return null;
    }
}

async function runExpression(expression: ExpressionStatement,
                             context: object,
                             extraHelpers: Map<string, Function>): Promise<LiteralValue> {
    if(expression.params.length === 0) {
        return runPathExpression(expression, context);
    }

    return await runHelperExpression(expression, context, extraHelpers);
}
