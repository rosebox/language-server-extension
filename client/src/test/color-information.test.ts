import * as vscode from 'vscode'
import * as assert from 'assert'
import { getDocUri, activate } from './helper'


suite('Should handle onDocumentColors properly', () => {
    const docUri = getDocUri('colors.rb.ts')
    const start =  new vscode.Position(1, 10)
    const end = new vscode.Position(1, 28)
    const range = new vscode.Range(start, end)
    const color = new vscode.Color(1, 1, 1, 1)
    const colorInfo = new vscode.ColorInformation(range, color)
    test('Provides correct ColorInformationList in a rb.ts file', async () => {
        await testCompletion(docUri, [
            colorInfo,
        ])
    })
})

async function testCompletion(docUri: vscode.Uri, expectedList: any[]) {
    await activate(docUri)

    const actualList = (await vscode.commands.executeCommand(
        'vscode.executeDocumentColorProvider',
        docUri,
    )) as any[]

    assert.ok(actualList.length === 1)
    expectedList.forEach((expectedItem, i) => {
        const actualItem = actualList[i]
        assert.deepStrictEqual(actualItem, expectedItem)
    })
}
