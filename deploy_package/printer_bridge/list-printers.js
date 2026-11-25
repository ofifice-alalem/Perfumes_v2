const config = require('./config.json');
const { getInstalledPrinters } = require('./src/printer/printer-detection');

function main() {
    console.log("==============================================");
    console.log(" Installed Windows Printers Detection");
    console.log("==============================================");

    const configuredPrinter = config.printer?.name || "POS-80";
    console.log(`Configured Printer in config.json: "${configuredPrinter}"\n`);

    const printers = getInstalledPrinters();

    if (printers.length === 0) {
        console.log("❌ No printers detected in Windows PowerShell.");
    } else {
        console.log(`Found ${printers.length} printer(s):\n`);
        let foundMatch = false;

        printers.forEach((p, idx) => {
            const isTarget = p.name.toLowerCase().includes(configuredPrinter.toLowerCase());
            if (isTarget) foundMatch = true;
            const badge = isTarget ? " [CONFIGURED MATCH]" : "";

            console.log(`${idx + 1}. Printer Name: "${p.name}"${badge}`);
            console.log(`   Driver:       ${p.driver}`);
            console.log(`   Port:         ${p.port}`);
            console.log(`   Status:       ${p.status}\n`);
        });

        console.log("----------------------------------------------");
        if (foundMatch) {
            console.log(`✔ Configured printer "${configuredPrinter}" is installed and ready.`);
        } else {
            console.log(`⚠ Configured printer "${configuredPrinter}" was not matched. Update config.json to one of the names above.`);
        }
    }

    console.log("==============================================");
}

main();
