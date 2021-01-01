/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */


import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    TextDocumentSyncKind,
    InitializeResult,
} from 'vscode-languageserver'
import {
    createSourceFile,
    ScriptTarget
} from 'typescript'
import { findColors, getColorsPresentations } from './services/color-service'

import { TextDocument } from 'vscode-languageserver-textdocument'

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all)

console.log = connection.console.log.bind(connection.console)
console.error = connection.console.error.bind(connection.console)

// Create a simple text document manager.
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

let hasConfigurationCapability: boolean = false
let hasWorkspaceFolderCapability: boolean = false
let hasDiagnosticRelatedInformationCapability: boolean = false

connection.onInitialize((params: InitializeParams) => {
    let capabilities = params.capabilities

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration)
    hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders)
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    )

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            colorProvider: true,
        },
    }
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true,
            },
        }
    }
    return result
})

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined)
    }
})

// The example settings
interface Settings {
    maxNumberOfProblems: number
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: Settings = { maxNumberOfProblems: 1000 }
let globalSettings: Settings = defaultSettings

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<Settings>> = new Map()

connection.onDidChangeConfiguration((change) => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear()
    } else {
        globalSettings = <Settings>(change.settings.roseboxLanguageClient || defaultSettings)
    }
})

// Only keep settings for open documents
documents.onDidClose((e) => {
    documentSettings.delete(e.document.uri)
})

connection.onDocumentColor((params) => {
    const document = documents.get(params.textDocument.uri)
    const text = document?.getText() ?? ''
    const sf = text ? createSourceFile(params.textDocument.uri, text, ScriptTarget.ES2015, true) : null
    const t = sf ? findColors(sf) : []
    return t
})

connection.onColorPresentation((params) => {
    const document = documents.get(params.textDocument.uri)
    const text = document?.getText(params.range) ?? ''
    return getColorsPresentations(params.color, params.range, text)
})

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection)

// Listen on the connection
connection.listen()
