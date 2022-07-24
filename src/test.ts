import { Pattern } from "./pattern"

export default function test(str: string) {
console.log(JSON.stringify(Pattern.compile(str).matcher, null, 2))
}
