package uz.jomboy.lavka.courier.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import uz.jomboy.lavka.courier.viewmodel.CourierViewModel

@Composable
fun HeatmapScreen(vm: CourierViewModel, onBack: () -> Unit) {
    LaunchedEffect(Unit) { vm.loadHeatmap() }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        TextButton(onClick = onBack) { Text("← Назад") }
        Text("Тепловая карта спроса", style = MaterialTheme.typography.headlineSmall)
        Text("Phase 3 — зоны A–F, surge", style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(16.dp))

        if (vm.heatmapZones.isEmpty()) {
            CircularProgressIndicator()
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(vm.heatmapZones) { zone ->
                    val intensity = (zone["demand_coeff"] as? Double)?.toFloat() ?: 0.5f
                    val surge = zone["surge_multiplier"] as? Double ?: 1.0
                    val forecast = (zone["forecast_orders"] as? Double)?.toInt()
                        ?: (zone["forecast_orders"] as? Int) ?: 0
                    val bg = Color(
                        red = 0.18f + intensity * 0.5f,
                        green = 0.49f + intensity * 0.2f,
                        blue = 0.20f,
                    )

                    Card(Modifier.fillMaxWidth()) {
                        Column(
                            Modifier.background(bg).padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                "Зона ${zone["zone"]}",
                                style = MaterialTheme.typography.titleLarge,
                                color = Color.White,
                            )
                            Text("Спрос: ${"%.0f".format(intensity * 100)}%", color = Color.White.copy(alpha = 0.9f))
                            Text("Прогноз: $forecast заказов/ч", color = Color.White.copy(alpha = 0.9f), style = MaterialTheme.typography.bodySmall)
                            if (surge > 1.05) {
                                Spacer(Modifier.height(4.dp))
                                Surface(color = Color(0xFFFF9800), shape = MaterialTheme.shapes.small) {
                                    Text(
                                        "SURGE ×${"%.1f".format(surge)}",
                                        Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
