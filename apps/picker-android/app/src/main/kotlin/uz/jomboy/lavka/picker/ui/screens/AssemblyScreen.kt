package uz.jomboy.lavka.picker.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.jomboy.lavka.picker.ble.BleScaleManager
import uz.jomboy.lavka.picker.ui.components.BarcodeCameraScanner
import uz.jomboy.lavka.picker.ui.theme.zoneColor
import uz.jomboy.lavka.picker.viewmodel.PickerViewModel

@Composable
fun AssemblyScreen(vm: PickerViewModel, onComplete: () -> Unit, onBack: () -> Unit) {
    val item = vm.currentItem
    var barcodeInput by remember { mutableStateOf("") }
    var aslInput by remember { mutableStateOf("") }

    LaunchedEffect(vm.currentItemIndex) {
        aslInput = ""
        vm.aslVerified = null
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            TextButton(onClick = onBack) { Text("← Назад") }
            Text("${vm.currentItemIndex + 1} / ${vm.sortedItems.size}", fontSize = 18.sp)
        }

        if (item == null) {
            Text("Сборка завершена")
            Button(onClick = onComplete, modifier = Modifier.fillMaxWidth().height(48.dp)) {
                Text("Упаковка")
            }
            return
        }

        Surface(color = zoneColor(item.zone), modifier = Modifier.fillMaxWidth()) {
            Text("Зона ${item.zone} • Полка ${item.shelf}", Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onPrimary)
        }

        Spacer(Modifier.height(16.dp))
        Text(item.name, fontSize = 22.sp)
        Text("Кол-во: ${item.quantity}")
        Text("Штрихкод: ${item.barcode}", style = MaterialTheme.typography.bodySmall)

        if (item.is_weighted) {
            val weight by BleScaleManager.weightKg.collectAsState()
            Text("⚖ Весовой товар — BLE-весы", style = MaterialTheme.typography.bodySmall)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { BleScaleManager.connectDemo() }) { Text("Подключить") }
                OutlinedButton(onClick = { BleScaleManager.simulateReading(item.quantity.toDouble()) }) { Text("Считать вес") }
            }
            weight?.let { Text("Вес: ${"%.2f".format(it)} кг") }
        }

        if (item.is_marked) {
            Spacer(Modifier.height(12.dp))
            Text("🏷 АСЛ БЕЛГИ — обязательная маркировка", style = MaterialTheme.typography.bodySmall)
            OutlinedTextField(
                value = aslInput,
                onValueChange = { aslInput = it },
                label = { Text("Код маркировки") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(4.dp))
            Button(
                onClick = { vm.verifyAsl(aslInput.trim()) },
                modifier = Modifier.fillMaxWidth(),
                enabled = aslInput.isNotBlank(),
            ) { Text("Проверить АСЛ") }
            vm.aslVerified?.let { ok ->
                Text(
                    if (ok) "✓ АСЛ OK" else "✗ Код недействителен",
                    color = if (ok) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        BarcodeCameraScanner(onBarcode = { code ->
            barcodeInput = code
            vm.scanBarcode(code)
        })

        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = barcodeInput,
            onValueChange = { barcodeInput = it },
            label = { Text("Скан / ввод штрихкода") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = {
                vm.scanBarcode(barcodeInput.trim())
                barcodeInput = ""
            }),
        )

        Spacer(Modifier.height(8.dp))

        vm.lastScanOk?.let { ok ->
            Text(if (ok) "✓ Скан OK" else "✗ Неверный штрихкод", color = if (ok) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error)
        }

        Spacer(Modifier.weight(1f))

        Button(
            onClick = {
                vm.scanBarcode(item.barcode)
                if (vm.currentItemIndex >= vm.sortedItems.size - 1 && vm.scannedCount >= vm.sortedItems.size) {
                    onComplete()
                }
            },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            enabled = !item.is_marked || vm.aslVerified == true,
        ) { Text("Подтвердить скан") }

        if (vm.currentItemIndex >= vm.sortedItems.size - 1 && vm.scannedCount >= vm.sortedItems.size) {
            Spacer(Modifier.height(8.dp))
            Button(onClick = onComplete, modifier = Modifier.fillMaxWidth().height(48.dp)) {
                Text("→ Упаковка")
            }
        }
    }
}
