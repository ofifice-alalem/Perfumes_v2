using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrintEngine {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static int Main(string[] args) {
        if (args.Length < 2) {
            Console.WriteLine("ERROR: Usage: RawPrintEngine.exe <PrinterName> <FilePath>");
            return 1;
        }

        string printerName = args[0];
        string filePath = args[1];

        if (!File.Exists(filePath)) {
            Console.WriteLine("ERROR: File not found: " + filePath);
            return 2;
        }

        try {
            byte[] bytes = File.ReadAllBytes(filePath);
            IntPtr hPrinter = IntPtr.Zero;

            if (!OpenPrinter(printerName.Normalize(), out hPrinter, IntPtr.Zero)) {
                Console.WriteLine("ERROR: Could not open printer: " + printerName + " (Error code: " + Marshal.GetLastWin32Error() + ")");
                return 3;
            }

            DOCINFOA di = new DOCINFOA();
            di.pDocName = "Thermal Receipt Job";
            di.pDataType = "RAW";

            if (!StartDocPrinter(hPrinter, 1, di)) {
                ClosePrinter(hPrinter);
                Console.WriteLine("ERROR: StartDocPrinter failed (Error code: " + Marshal.GetLastWin32Error() + ")");
                return 4;
            }

            if (!StartPagePrinter(hPrinter)) {
                EndDocPrinter(hPrinter);
                ClosePrinter(hPrinter);
                Console.WriteLine("ERROR: StartPagePrinter failed");
                return 5;
            }

            IntPtr pBytes = Marshal.AllocHGlobal(bytes.Length);
            Marshal.Copy(bytes, 0, pBytes, bytes.Length);

            int dwWritten = 0;
            bool success = WritePrinter(hPrinter, pBytes, bytes.Length, out dwWritten);
            Marshal.FreeHGlobal(pBytes);

            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);

            if (success && dwWritten == bytes.Length) {
                Console.WriteLine("SUCCESS: Printed " + dwWritten + " bytes to printer: " + printerName);
                return 0;
            } else {
                Console.WriteLine("ERROR: WritePrinter failed (Written " + dwWritten + "/" + bytes.Length + " bytes)");
                return 6;
            }
        } catch (Exception ex) {
            Console.WriteLine("ERROR: Exception occurred: " + ex.Message);
            return 7;
        }
    }
}
