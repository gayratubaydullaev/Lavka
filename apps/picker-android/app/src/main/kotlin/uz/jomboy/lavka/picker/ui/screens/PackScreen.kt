package uz.jomboy.lavka.picker.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import uz.jomboy.lavka.picker.viewmodel.PickerViewModel

@Composable
fun PackScreen(vm: PickerViewModel, onDone: () -> Unit) {
    var packageId by remember { mutableStateOf("PKG-${System.currentTimeMillis()}") }
    var useThermalBag by remember { mutableStateOf(vm.sortedItems.any { it.zone == "C" }) }
    var tempC by remember { mutableStateOf("-18") }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Упаковка", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = packageId,
            onValueChange = { packageId = it },
            label = { Text("QR пакета") },
            modifier = Modifier.fillMaxWidth(),
        )

        if (useThermalBag) {
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Checkbox(checked = useThermalBag, onCheckedChange = { useThermalBag = it })
                Text("Термосумка (зона C — заморозка)")
            }
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = tempC,
                onValueChange = { tempC = it },
                label = { Text("Температура сумки °C (IoT / ручной ввод)") },
                modifier = Modifier.fillMaxWidth(),
            )
        }

        Spacer(Modifier.height(24.dp))
        Text("Статус: READY")
        Text("Зона выдачи: HANDOFF-1")

        Spacer(Modifier.weight(1f))

        Button(
            onClick = {
                vm.complete(packageId, if (useThermalBag) "THERMO-001" else null)
                onDone()
            },
            modifier = Modifier.fillMaxWidth().height(56.dp),
        ) { Text("Передать курьеру") }
    }
}
