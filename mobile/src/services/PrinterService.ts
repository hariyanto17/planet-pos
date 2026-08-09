import { Platform } from "react-native";
import { BluetoothManager, BluetoothEscposPrinter } from "@vardrz/react-native-bluetooth-escpos-printer";

export interface BluetoothDevice {
  name: string;
  address: string;
}

class PrinterService {
  private connectedDevice: BluetoothDevice | null = null;

  // Helper functions for 58mm (32 characters width) formatting
  centerLine(text: string, width: number = 32): string {
    if (text.length >= width) return text.substring(0, width);
    const totalSpaces = width - text.length;
    const leftSpaces = Math.floor(totalSpaces / 2);
    const rightSpaces = totalSpaces - leftSpaces;
    return " ".repeat(leftSpaces) + text + " ".repeat(rightSpaces);
  }

  padLine(left: string, right: string, width: number = 32): string {
    const spacesCount = width - left.length - right.length;
    const spaces = spacesCount > 0 ? " ".repeat(spacesCount) : " ";
    return left + spaces + right;
  }

  formatCurrency(value: number): string {
    return "Rp" + Math.round(value).toLocaleString("id-ID");
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  separator(): string {
    return "--------------------------------";
  }

  async feed(lines: number = 1): Promise<void> {
    await (BluetoothEscposPrinter as any).printText("\n".repeat(lines), {});
  }

  async cut(): Promise<void> {
    if (typeof (BluetoothEscposPrinter as any).cut === "function") {
      await (BluetoothEscposPrinter as any).cut();
    }
  }

  async getPairedDevices(): Promise<BluetoothDevice[]> {
    try {
      const isEnabled = await BluetoothManager.isBluetoothEnabled();
      if (!isEnabled && Platform.OS === "android") {
        await BluetoothManager.enableBluetooth();
      }

      const devicesStr = await BluetoothManager.enableBluetooth();
      if (Array.isArray(devicesStr)) {
        return devicesStr.map((item: any) => {
          if (typeof item === "string") {
            try {
              return JSON.parse(item);
            } catch {
              return { name: "Unknown Device", address: item };
            }
          }
          return { name: item.name || "Unknown Device", address: item.address };
        });
      }

      return [
        { name: "Demo Printer (58mm)", address: "00:11:22:33:44:55" },
        { name: "Demo Printer (80mm)", address: "AA:BB:CC:DD:EE:FF" },
      ];
    } catch (error) {
      console.warn("[PrinterService] Failed to get paired devices, returning demo list:", error);
      return [
        { name: "Demo Printer (58mm)", address: "00:11:22:33:44:55" },
        { name: "Demo Printer (80mm)", address: "AA:BB:CC:DD:EE:FF" },
      ];
    }
  }

  async connect(device: BluetoothDevice): Promise<boolean> {
    if (device.address === "00:11:22:33:44:55" || device.address === "AA:BB:CC:DD:EE:FF") {
      this.connectedDevice = device;
      console.log(`[PrinterService] Simulated connect to ${device.name}`);
      return true;
    }

    try {
      await BluetoothManager.connect(device.address);
      this.connectedDevice = device;
      console.log(`[PrinterService] Connected to ${device.name} (${device.address})`);
      return true;
    } catch (error) {
      console.error("[PrinterService] Connection failed:", error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connectedDevice) return;

    if (this.connectedDevice.address !== "00:11:22:33:44:55" && this.connectedDevice.address !== "AA:BB:CC:DD:EE:FF") {
      try {
        console.log(`[PrinterService] Disconnected from device ${this.connectedDevice.name}`);
      } catch (error) {
        console.warn("[PrinterService] Disconnect error:", error);
      }
    }

    this.connectedDevice = null;
  }

  async isConnected(): Promise<boolean> {
    return this.connectedDevice !== null;
  }

  async printReceipt(receiptText: string): Promise<boolean> {
    if (!this.connectedDevice) {
      console.log("--- FORMATTED ESC/POS RECEIPT (NOT CONNECTED) ---\n" + receiptText);
      return false;
    }

    if (this.connectedDevice.address === "00:11:22:33:44:55" || this.connectedDevice.address === "AA:BB:CC:DD:EE:FF") {
      console.log(`[PrinterService] (Simulated Print) to ${this.connectedDevice.name}:\n${receiptText}`);
      return true;
    }

    try {
      const printer = BluetoothEscposPrinter as any;
      await printer.printerInit();

      // Print centered header
      await printer.printerAlign(printer.ALIGN.CENTER);
      await printer.printText(this.centerLine("PLANET CINEMA CONCESSION") + "\n", {});

      // Print line by line with correct ESC/POS styles
      const lines = receiptText.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (i >= lines.length - 3 && line.trim() === "") {
          continue; // skip trailing empty lines
        }

        // Align center for header and footer lines, left for the rest
        if (this.isCenterLine(line)) {
          await printer.printerAlign(printer.ALIGN.CENTER);
          await printer.printText(line + "\n", {});
        } else {
          await printer.printerAlign(printer.ALIGN.LEFT);
          await printer.printText(line + "\n", {});
        }
      }

      await this.feed(3);
      await this.cut();

      console.log("[PrinterService] Printed successfully to hardware.");
      return true;
    } catch (error) {
      console.error("[PrinterService] Print error:", error);
      return false;
    }
  }

  isCenterLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return (
      trimmed.includes("PLANET CINEMA") ||
      trimmed.includes("TERIMA KASIH") ||
      trimmed.includes("Layanan Pelanggan") ||
      trimmed.includes("Instagram:")
    );
  }

  formatReceipt(order: any): string {
    const divider = this.separator() + "\n";
    let receipt = "";

    receipt += this.centerLine("PLANET CINEMA CONCESSION") + "\n";
    receipt += this.centerLine("Layanan Pelanggan: (021) 1234567") + "\n";
    receipt += this.centerLine("Instagram: @planetcinema") + "\n";
    receipt += "\n";

    // Transaction info
    receipt += divider;
    receipt += `No : ${order.displayNumber}\n`;
    receipt += `Tgl: ${this.formatDate(order.createdAt || new Date().toISOString())}\n`;
    receipt += `Tipe: ${order.orderType === "DINE_IN" ? "Makan di Sini" : "Bawa Pulang"}\n`;
    if (order.table?.name) {
      receipt += `Meja: ${order.table.name}\n`;
    }
    receipt += divider;
    receipt += "\n";

    // Items list
    order.items?.forEach((item: any) => {
      receipt += `${item.productName}\n`;
      const qtyPrice = `${item.quantity} x ${this.formatCurrency(item.unitPrice)}`;
      const subtotal = this.formatCurrency(Number(item.unitPrice) * item.quantity);
      receipt += this.padLine(qtyPrice, subtotal) + "\n";
      if (item.note) {
        receipt += `  Catatan: ${item.note}\n`;
      }
    });
    receipt += "\n";

    // Summary
    receipt += divider;
    receipt += this.padLine("SUBTOTAL", this.formatCurrency(order.subtotal)) + "\n";
    if (Number(order.discountAmount) > 0) {
      receipt += this.padLine("DISKON", `-${this.formatCurrency(order.discountAmount)}`) + "\n";
    }
    if (Number(order.taxAmount) > 0) {
      receipt += this.padLine("PAJAK", this.formatCurrency(order.taxAmount)) + "\n";
    }
    receipt += this.padLine("TOTAL", this.formatCurrency(order.grandTotal)) + "\n";
    receipt += "\n";

    const latestPayment = order.payments?.[0];
    if (latestPayment) {
      const paymentLabel = latestPayment.method === "CASH" ? "Tunai" : latestPayment.method;
      const cashReceived = latestPayment.method === "CASH" 
        ? (latestPayment.status === "PAID" ? latestPayment.receivedCash : latestPayment.estimatedCash) 
        : order.grandTotal;

      receipt += this.padLine(paymentLabel, this.formatCurrency(cashReceived)) + "\n";
      if (latestPayment.method === "CASH") {
        receipt += this.padLine("Kembalian", this.formatCurrency(latestPayment.changeAmount || 0)) + "\n";
      }
    }
    receipt += divider;
    receipt += "\n";

    // Footer
    receipt += this.centerLine("TERIMA KASIH") + "\n";
    receipt += this.centerLine("Selamat Menikmati Film Anda") + "\n";

    return receipt;
  }

  async printTestPage(): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error("Printer not connected.");
    }

    const testText = 
      this.separator() + "\n" +
      this.centerLine("STRUK UJI COBA") + "\n" +
      this.centerLine("PLANET CINEMA CONCESSION") + "\n" +
      this.separator() + "\n" +
      this.padLine("Item Test 1", this.formatCurrency(25000)) + "\n" +
      this.padLine("Item Test 2", this.formatCurrency(15000)) + "\n" +
      this.separator() + "\n" +
      this.padLine("TOTAL", this.formatCurrency(40000)) + "\n" +
      this.separator() + "\n" +
      this.centerLine("Printer Berfungsi dengan Baik") + "\n" +
      this.centerLine(this.formatDate(new Date().toISOString())) + "\n";

    const success = await this.printReceipt(testText);
    if (!success) {
      throw new Error("Print execution failed.");
    }
  }
}

export default new PrinterService();
