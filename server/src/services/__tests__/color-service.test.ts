import * as ts from 'typescript'
import { findColors } from '../color-service'

test('findColors', () => {
    const text = `
	rgb(255, 255, 255)
	`
    const sf = ts.createSourceFile('foo.ts', text, ts.ScriptTarget.ES2015, true)
    const received = findColors(sf)
    const expected = [
        {
            color: {
                red: 1,
                green: 1,
                blue: 1,
                alpha: 1,
            },
            range: {
                start: {
                    line: 1,
                    character: 1,
                },
                end: {
                    line: 1,
                    character: 19,
                },
            },
        },
    ]
    expect(received).toEqual(expected)
})

test('findColors', () => {
    const text = `
	const a = "testios"
    rgba(255, 255, 255, 0.5)

	`
    const sf = ts.createSourceFile('foo.ts', text, ts.ScriptTarget.ES2015, true)
    const received = findColors(sf)
    const expected = [
        {
            color: {
                red: 1,
                green: 1,
                blue: 1,
                alpha: 0.5,
            },
            range: {
                start: {
                    line: 2,
                    character: 1,
                },
                end: {
                    line: 2,
                    character: 25,
                },
            },
        },
    ]
    expect(received).toEqual(expected)
})

test('findColors - invalid RGB', () => {
    const text = `
	const a = "testios"
	rgba(255.5, 255, 255, 2)
	`
    const sf = ts.createSourceFile('foo.ts', text, ts.ScriptTarget.ES2015, true)
    const received = findColors(sf)
    const expected: any[] = []
    expect(received).toEqual(expected)
})

test('findColors - invalid RGBA', () => {
    const text = `
	const a = "testios"
	rgba(255, 255, 255, 2)
	`
    const sf = ts.createSourceFile('foo.ts', text, ts.ScriptTarget.ES2015, true)
    const received = findColors(sf)
    const expected: any[] = []
    expect(received).toEqual(expected)
})
