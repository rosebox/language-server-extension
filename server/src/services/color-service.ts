import {
    isNumericLiteral,
    NumericLiteral,
    CallExpression,
    isCallExpression,
    SourceFile,
    NodeArray,
    StringLiteral,
    Node
} from 'typescript'
import { TextEdit } from 'vscode-languageserver'
import { ColorPresentation, ColorInformation, Range, Color } from 'vscode-languageserver-types'
const colorM = require('color')

const rgbFromHex = (hexStr: string) => colorM(hexStr).rgb()

const safeHex = (str: string) => {
    try {
        return colorM(str) || null
    } catch (e) {
        return null
    }
}

let log = (x: any): void => {}

/** [start, end[ */
const isInRange = (x: number, start: number, end: number) => x >= start && x < end

const isPerFunction = (argument: any) => argument.expression?.escapedText === 'per'
const isInteger = (argument: any) => Number.isInteger(parseFloat(argument.text))

const isPercentageArgument = (argument: any): boolean => {
    log('isPercentageArgument')
    const hasValidArguments = () => {
        const funcArguments: any[] = argument.arguments ?? []
        return (
            funcArguments.length === 1 &&
            funcArguments.every((arg) => {
                return isNumericLiteral(arg) && isInRange(parseInt(arg.text), 0, 101)
            })
        )
    }

    return isPerFunction(argument) && hasValidArguments()
}

const isValidPercentageArgument = (argument: any) => {
    const isPercentage = argument?.expression?.escapedText === 'per'
    const hasValidNumberArg = () =>
        argument.arguments.filter(
            (arg: any) =>
                Number.isInteger(parseFloat(arg.text)) && parseInt(arg.text) >= 0 && parseInt(arg.text) <= 100,
        ).length === 1
    return isPercentage && hasValidNumberArg()
}

const isRGBCallExpression = (node: any): node is CallExpression => {
    const escapedText = node.expression?.escapedText
    const hasValidArgs = () => {
        const args = node.arguments
        return args.length === 3 && (args.every(isPercentageArgument) || args.every(isValidRGBNumberArgument))
    }
    return isCallExpression(node) && escapedText === 'rgb' && hasValidArgs()
}

const isRGBACallExpression = (node: any): node is CallExpression => {
    const escapedText = node.expression?.escapedText
    const hasValidArgs = () => {
        const args = node.arguments ?? []
        return (
            args.length === 4 &&
            isValidAlpha(args[3]) &&
            (args?.slice(0, 3).every(isValidRGBNumberArgument) || args.slice(0, 3).every(isValidPercentageArgument))
        )
    }

    return isCallExpression(node) && escapedText === 'rgba' && hasValidArgs()
}

const isValidNumberArgument = (arg: any): boolean => {
    const value = parseInt(arg?.text)
    return !isNaN(value)
}

const isValidRGBNumberArgument = (arg: any): boolean => {
    return isNumericLiteral(arg) && isInRange(parseInt(arg?.text), 0, 256)
}

const isValidHueNumberArgument = (arg: any): boolean => {
    return isNumericLiteral(arg) && isInRange(parseInt(arg?.text), 0, 361)
}

const isHSLExpression = (node: any): boolean => {
    const escapedText = node.expression?.escapedText
    const [arg1, arg2, arg3] = node.arguments ?? []
    const hasValidArgs =
        node.arguments?.length === 3 &&
        isValidHueNumberArgument(arg1) &&
        isValidPercentageArgument(arg2) &&
        isValidPercentageArgument(arg3)
    return isCallExpression(node) && escapedText === 'hsl' && hasValidArgs
}

const isHSLAExpression = (node: any): boolean => {
    const escapedText = node.expression?.escapedText
    const args = node.arguments ?? []
    const hasValidArgs =
        args.length === 4 &&
        isValidNumberArgument(args[0]) &&
        isValidPercentageArgument(args[1]) &&
        isValidPercentageArgument(args[2]) &&
        isValidAlpha(args[3])
    return isCallExpression(node) && escapedText === 'hsla' && hasValidArgs
}

const isValidAlpha = (arg: any) => {
    const value = parseFloat(arg?.text)
    return !isNaN(value) && value >= 0 && value <= 1
}

const isHEXExpression = (node: any): node is CallExpression => {
    const escapedText = node.expression?.escapedText
    const argument = node.arguments ? node.arguments[0]?.text : null
    const hasValidArgs = node?.arguments?.length === 1 && !!safeHex(argument)
    return isCallExpression(node) && escapedText === 'hex' && hasValidArgs
}

/** Takes a tuple of RGB values in the range [0..1]  */
const constructRGBColor = (colorArgs: [number, number, number]): Color => ({
    red: colorArgs[0],
    green: colorArgs[1],
    blue: colorArgs[2],
    alpha: 1,
})

/** Takes a tuple of RGBA values in the range [0..1]  */
const constructRGBAColor = (colorArgs: [number, number, number, number]): Color => ({
    red: colorArgs[0],
    green: colorArgs[1],
    blue: colorArgs[2],
    alpha: colorArgs[3],
})

const extractRGBNumber = (argument: NumericLiteral | CallExpression) => {
    return isCallExpression(argument)
        ? parseInt((argument.arguments[0] as NumericLiteral).text) / 100
        : parseInt((argument as NumericLiteral).text) / 255
}

const extractHSLNumber = (argument: any) => {
    return argument?.expression?.escapedText === 'per' ? parseInt(argument.arguments[0].text) : parseInt(argument.text)
}

const createHSLColorInformation = (sourceFile: any, node: any): ColorInformation => {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart())
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd())
    const args: number[] = node.arguments.map(extractHSLNumber)
    const rgbArgs = colorM
        .hsl(...args)
        .rgb()
        .array()
        .map((item: any) => item / 255)
    const color = constructRGBColor(rgbArgs as [number, number, number])
    return {
        color,
        range: {
            start,
            end,
        } as Range,
    }
}

const createHSLAColorInformation = (sourceFile: any, node: any): ColorInformation => {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart())
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd())
    const argsWithoutAlpha: number[] = node.arguments.slice(0, 3).map(extractHSLNumber)
    const RGBAArgs = colorM
        .hsl(...argsWithoutAlpha)
        .rgb()
        .array()
        .map((item: number) => item / 255)
        .concat([parseFloat(node.arguments[3].text)])
    const color = constructRGBAColor(RGBAArgs)
    return {
        color,
        range: {
            start,
            end,
        } as Range,
    }
}

type RGBArgumentNode = NumericLiteral | CallExpression

/** Returns a triple of rgb values in the range [0..1] */
const parseRGBArgs = (args: NodeArray<RGBArgumentNode>): [number, number, number] => {
    return args.map(extractRGBNumber) as [number, number, number]
}

const createRGBColorInformation = (sourceFile: SourceFile, node: CallExpression): ColorInformation => {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart())
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd())
    const args = parseRGBArgs(<NodeArray<RGBArgumentNode>>node.arguments)
    const color = constructRGBColor(args)
    return {
        color,
        range: {
            start,
            end,
        } as Range,
    }
}

const createRGBAColorInformation = (sourceFile: SourceFile, node: CallExpression): ColorInformation => {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart())
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd())
    const nodeArguments = node.arguments as NodeArray<RGBArgumentNode>
    const args = nodeArguments
        .slice(0, 3)
        .map(extractRGBNumber)
        .concat([parseFloat((<NumericLiteral>nodeArguments[3]).text)]) as [number, number, number, number]

    const color = constructRGBAColor(args)
    return {
        color,
        range: {
            start,
            end,
        } as Range,
    }
}

const createHEXColorInformation = (sourceFile: SourceFile, node: CallExpression): ColorInformation => {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart())
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd())
    const hexValue = (node.arguments[0] as StringLiteral).text
    const rgbColor = rgbFromHex(hexValue)
    const args = rgbColor
        .array()
        .map((item: number) => item / 255)
        .concat([rgbColor.alpha()]) as [number, number, number, number]
    return {
        color: constructRGBAColor(args),
        range: {
            start,
            end,
        } as Range,
    }
}

const createColorNode = (sourceFile: SourceFile, node: Node): ColorInformation | null => {
    if (isHEXExpression(node)) {
        return createHEXColorInformation(sourceFile, node)
    }
    if (isRGBCallExpression(node)) {
        return createRGBColorInformation(sourceFile, node)
    }
    if (isRGBACallExpression(node)) {
        return createRGBAColorInformation(sourceFile, node)
    }
    if (isHSLAExpression(node)) {
        return createHSLAColorInformation(sourceFile, node)
    }
    if (isHSLExpression(node)) {
        return createHSLColorInformation(sourceFile, node)
    }

    return null
}

function findDocumentColors(sourceFile: SourceFile, node: Node): ColorInformation[] {
    const init = [createColorNode(sourceFile, node)].filter((item) => item !== null) as ColorInformation[]
    return node.getChildren().reduce((acc: ColorInformation[], item: Node) => {
        return acc.concat(findDocumentColors(sourceFile, item))
    }, init)
}

export const findColors = (sourceFile: any) => {
    return findDocumentColors(sourceFile, sourceFile)
}

function getColorType(text: string) {
    if (text.slice(0, 3) === 'hex') return 'hex'
    if (text.slice(0, 4) === 'rgba') return 'rgba'
    if (text.slice(0, 3) === 'rgb') return 'rgb'
    if (text.slice(0, 4) === 'hsla') return 'hsla'
    if (text.slice(0, 3) === 'hsl') return 'hsl'
    return null
}

export const getColorsPresentations = (color: Color, range: any, text: string): ColorPresentation[] => {
    const [red256, green256, blue256] = [color.red, color.green, color.blue].map((item) => Math.round(item * 255))
    const colorType = getColorType(text)

    if (colorType === 'rgb' || colorType === 'rgba') {
        const label =
            color.alpha === 1
                ? `rgb(${red256}, ${green256}, ${blue256})`
                : `rgba(${red256}, ${green256}, ${blue256}, ${color.alpha})`
        return [{ label }]
    }

    if (colorType === 'hex') {
        const label = colorM.rgb(red256, green256, blue256).alpha(color.alpha).hex()
        const textEdit = TextEdit.replace(range, `hex('${label}')`)
        return [{ label: label, textEdit }]
    }

    if (colorType === 'hsl' || colorType === 'hsla') {
        const hsl = colorM.rgb(red256, green256, blue256).alpha(color.alpha).hsl()
        const [h, s, l] = hsl.array().map(Math.round)
        const label = color.alpha === 1 ? `hsl(${h}, ${s}%, ${l}%)` : `hsla(${h}, ${s}%, ${l}%, ${hsl.alpha()})`
        const text =
            color.alpha === 1 ? `hsl(${h}, per(${s}), per(${l}))` : `hsla(${h}, per(${s}), per(${l}), ${hsl.alpha()})`
        const textEdit = TextEdit.replace(range, text)
        return [{ label: label, textEdit }]
    }
    return []
}
