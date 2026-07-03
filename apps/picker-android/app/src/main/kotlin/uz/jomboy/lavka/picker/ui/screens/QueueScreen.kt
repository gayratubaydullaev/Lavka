package uz.jomboy.lavka.picker.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import uz.jomboy.lavka.picker.viewmodel.PickerViewModel

@Composable
fun QueueScreen(vm: PickerViewModel, onStartTask: () -> Unit, onStats: () -> Unit) {
    LaunchedEffect(Unit) { vm.loadNextTask() }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Очередь задач", style = MaterialTheme.typography.headlineSmall)
            TextButton(onClick = onStats) { Text("KPI") }
        }

        if (vm.isOffline) {
            Surface(color = MaterialTheme.colorScheme.errorContainer, modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                Text("Нет сети — данные сохранятся автоматически", Modifier.padding(12.dp))
            }
        }

        val task = vm.currentTask
        if (task == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            Card(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Заказ #${task.order_id.take(8)}")
                    Text("SLA: ${task.sla_deadline}", style = MaterialTheme.typography.bodySmall)
                    Text("Позиций: ${task.items.size}")
                    Text("Зоны: ${task.items.map { it.zone }.distinct().sorted().joinToString(" → ")}")
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = {
                            vm.startTask()
                            onStartTask()
                        },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                    ) { Text("Начать сборку") }
                }
            }
        }
    }
}
