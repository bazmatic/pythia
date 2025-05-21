export function extractJson (text: string): any | null {
    // Find the first opening bracket
    const start = text.indexOf("{");
    if (start === -1) {
        return null;
    }
    // Find the last closing bracket
    const end = text.lastIndexOf("}");
    if (end === -1) {
        return null;
    }
    // Remove any escape characters like /n
    text = text.replace(/\n/g, "");
    text = text.replace(/\r/g, "");
    text = text.replace(/\t/g, "");
    text = text.replace(/\f/g, "");
    text = text.replace(/\v/g, "");
    text = text.replace(/\b/g, "");
    text = text.replace(/\r/g, "");

    // Extract the JSON string
    const json = text.slice(start, end + 1);
    console.log("Extracted and cleaned JSON:", json);
    try {
        return JSON.parse(json);
    } catch (e) {
        return null;
    }

};
