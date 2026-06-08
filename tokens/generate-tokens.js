const fs = require('fs');
const path = require('path');

const colorsTokenPath = path.join(__dirname, 'colors-token.json');
const typographyTokenPath = path.join(__dirname, 'typography-token.json');
const outputCssPath = path.join(__dirname, 'design-tokens.css');

function resolveColorReference(value, paletteKeys) {
    if (value.startsWith('{color.palette.') && value.endsWith('}')) {
        const pathParts = value.slice(15, -1).split('.');
        const colorFamily = pathParts[0];
        const shade = pathParts[1];

        if (paletteKeys[colorFamily] && paletteKeys[colorFamily][shade]) {
            return paletteKeys[colorFamily][shade];
        }
    } else if (value.startsWith('{color.key.') && value.endsWith('}')) {
         // handle primary etc
         // example: {color.key.primary}
         const pathParts = value.slice(11, -1).split('.');
         // This is a simplification. We assume the key always exists.
         // In a robust script, you'd want to handle missing keys.
         // We might need to adjust this depending on the exact structure.
         return undefined; // We will handle this by parsing the actual JSON.
    }
    return value;
}

function processTokens() {
    try {
        const colorsRaw = fs.readFileSync(colorsTokenPath, 'utf8');
        const colorsJson = JSON.parse(colorsRaw);

        const typographyRaw = fs.readFileSync(typographyTokenPath, 'utf8');
        const typographyJson = JSON.parse(typographyRaw);

        let cssOutput = ':root {\n';

        // Process Typography
        cssOutput += '  /* Typography */\n';
        for (const [familyKey, familyValue] of Object.entries(typographyJson)) {
            for (const [key, value] of Object.entries(familyValue)) {
                // Convert camelCase to kebab-case
                const kebabKey = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
                
                let cssValue = value;
                if (familyKey === 'lineHeight' && typeof value === 'number') {
                    cssValue = `${value}px`;
                }

                cssOutput += `  --${familyKey}-${kebabKey}: ${cssValue};\n`;
            }
        }

        cssOutput += '\n  /* Colors - Light Theme */\n';

        const palette = colorsJson.color.palette;
        const keyColors = colorsJson.color.key;
        
        function resolveColor(value) {
            if (value.startsWith('{color.palette.')) {
                const parts = value.slice(15, -1).split('.');
                if (palette[parts[0]] && palette[parts[0]][parts[1]]) {
                     return palette[parts[0]][parts[1]];
                }
            } else if (value.startsWith('{color.key.')) {
                const parts = value.slice(11, -1).split('.');
                if (keyColors[parts[0]]) {
                    return keyColors[parts[0]];
                }
            }
            return value;
        }

        const lightRoles = colorsJson.color.role.light;
        for (const [role, value] of Object.entries(lightRoles)) {
            const kebabRole = role.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
            const resolvedColor = resolveColor(value);
            // Handle potentially undefined error palette values that might be missing in original json
            if(resolvedColor) {
               cssOutput += `  --color-${kebabRole}: ${resolvedColor};\n`;
            }
        }

        cssOutput += '}\n\n';

        // Process Dark Theme
        cssOutput += '@media (prefers-color-scheme: dark) {\n';
        cssOutput += '  :root {\n';
        cssOutput += '    /* Colors - Dark Theme */\n';

        const darkRoles = colorsJson.color.role.dark;
        for (const [role, value] of Object.entries(darkRoles)) {
            const kebabRole = role.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
            const resolvedColor = resolveColor(value);
            if(resolvedColor) {
               cssOutput += `    --color-${kebabRole}: ${resolvedColor};\n`;
            }
        }
        cssOutput += '  }\n';
        cssOutput += '}\n';

        fs.writeFileSync(outputCssPath, cssOutput, 'utf8');
        console.log(`Successfully generated CSS tokens at ${outputCssPath}`);

    } catch (error) {
        console.error('Error processing tokens:', error);
    }
}

processTokens();
