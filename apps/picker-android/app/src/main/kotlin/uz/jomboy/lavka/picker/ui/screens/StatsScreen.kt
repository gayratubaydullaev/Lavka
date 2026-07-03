package uz.jomboy.lavka.picker.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import uz.jomboy.lavka.picker.viewmodel.PickerViewModel

@Composable
fun StatsScreen(vm: PickerViewModel, onBack: () -> Unit) {
    LaunchedEffect(Unit) { vm.loadStats() }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        TextButton(onClick = onBack) { Text("← Назад") }
        Text("KPI сборщика", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(16.dp))

        vm.stats?.let { s ->
            StatCard("Заказов сегодня", "${s["orders_today"]}")
            StatCard("Среднее время", "${s["avg_time_minutes"]} мин")
            StatCard("Точность", "${s["accuracy_rating"]}")
        } ?: CircularProgressIndicator()
    }
}

@Composable
private fun StatCard(label: String, value: String) {
    Card(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label)
            Text(value, style = MaterialTheme.typography.titleMedium)
        }
    }
}
