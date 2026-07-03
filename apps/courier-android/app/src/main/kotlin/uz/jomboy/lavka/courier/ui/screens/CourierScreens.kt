package uz.jomboy.lavka.courier.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import java.io.File
import uz.jomboy.lavka.courier.viewmodel.CourierViewModel

@Composable
fun AuthScreen(onAuth: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Jomboy Курьер", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(32.dp))
        Button(onClick = onAuth, modifier = Modifier.fillMaxWidth().height(48.dp)) { Text("Войти (OTP demo)") }
    }
}

@Composable
fun ShiftScreen(vm: CourierViewModel, onOnline: () -> Unit, onStats: () -> Unit) {
    var selectedVehicle by remember { mutableStateOf("bicycle") }
    val vehicles = listOf("foot" to "Пеший", "bicycle" to "Велосипед", "moped" to "Мопед", "car" to "Авто")

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Смена", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(16.dp))
        vehicles.forEach { (id, label) ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                RadioButton(selected = selectedVehicle == id, onClick = { selectedVehicle = id })
                Text(label)
            }
        }
        Spacer(Modifier.height(24.dp))
        Button(
            onClick = { vm.startShift(selectedVehicle); onOnline() },
            modifier = Modifier.fillMaxWidth().height(56.dp),
        ) { Text("Начать смену") }
        TextButton(onClick = onStats) { Text("Статистика") }
    }
}

@Composable
fun HomeScreen(vm: CourierViewModel, onDelivery: (String) -> Unit, onActive: () -> Unit, onHeatmap: () -> Unit) {
    LaunchedEffect(vm.currentOffer) {
        while (vm.currentOffer != null && vm.offerTimer > 0) {
            kotlinx.coroutines.delay(1000)
            vm.tickOfferTimer()
        }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(if (vm.isOnline) "Online" else "Offline", color = MaterialTheme.colorScheme.primary)
            TextButton(onClick = { vm.stopShift() }) { Text("Стоп") }
        }

        if (vm.isOffline) {
            Surface(color = MaterialTheme.colorScheme.errorContainer, modifier = Modifier.fillMaxWidth()) {
                Text("Нет сети — данные сохранятся автоматически", Modifier.padding(12.dp))
            }
        }

        vm.currentOffer?.let { offer ->
            Card(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Новый заказ!", style = MaterialTheme.typography.titleLarge)
                    Text("Адрес: ${offer.address_masked}")
                    Text("Заработок: ${offer.earnings} сум")
                    Text("Расстояние: ${offer.distance_km} км • ${offer.weight_kg} кг")
                    Text("Таймер: ${vm.offerTimer} сек", color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { vm.acceptOffer(); onDelivery(offer.order_id) }, modifier = Modifier.weight(1f).height(48.dp)) {
                            Text("Принять")
                        }
                        OutlinedButton(onClick = { vm.skipOffer() }, modifier = Modifier.weight(1f).height(48.dp)) {
                            Text("Пропустить")
                        }
                    }
                }
            }
        }

        if (vm.activeOrders.isNotEmpty()) {
            Button(onClick = onActive, modifier = Modifier.fillMaxWidth()) {
                Text("Активные заказы (${vm.activeOrders.size})")
            }
        }

        Spacer(Modifier.weight(1f))
        OutlinedButton(onClick = onHeatmap, modifier = Modifier.fillMaxWidth()) {
            Text("Тепловая карта спроса")
        }
    }
}

@Composable
fun ActiveOrdersScreen(vm: CourierViewModel, onDelivery: (String) -> Unit, onBack: () -> Unit) {
    LaunchedEffect(Unit) { vm.loadActiveOrders() }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        TextButton(onClick = onBack) { Text("← Назад") }
        Text("Активные заказы (до 2)", style = MaterialTheme.typography.headlineSmall)
        vm.activeOrders.forEach { order ->
            val id = order["id"] as? String ?: return@forEach
            Card(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Row(Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("#${id.take(8)}")
                    Button(onClick = { onDelivery(id) }) { Text("Доставить") }
                }
            }
        }
    }
}

@Composable
fun DeliveryScreen(orderId: String, vm: CourierViewModel, onDone: () -> Unit) {
    var step by remember { mutableIntStateOf(0) }
    var otp by remember { mutableStateOf("") }
    var tempC by remember { mutableStateOf("-18") }
    var photoCaptured by remember { mutableStateOf(false) }
    val context = LocalContext.current

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Заказ #${orderId.take(8)}", style = MaterialTheme.typography.headlineSmall)

        when (step) {
            0 -> {
                Text("Забрать на дарксторе — сканируйте QR пакета")
                Button(onClick = { vm.pickup(orderId); step = 1 }, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                    Text("Забрал заказ")
                }
            }
            1 -> {
                Text("Маршрут к клиенту")
                Text("Ориентир: вход со двора, синие ворота")
                OutlinedButton(
                    onClick = {
                        val uri = Uri.parse("dgis://2gis.ru/routeSearch/rsType/car/to/69.24,41.31")
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, uri).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }.let { intent ->
                                if (intent.resolveActivity(context.packageManager) != null) intent
                                else Intent(Intent.ACTION_VIEW, Uri.parse("yandexnavi://build_route_on_map?lat_to=41.31&lon_to=69.24"))
                            },
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Открыть 2GIS / Яндекс") }
                Spacer(Modifier.height(12.dp))
                Text("IoT термосумка — показания t°", style = MaterialTheme.typography.bodySmall)
                OutlinedTextField(
                    value = tempC,
                    onValueChange = { tempC = it },
                    label = { Text("Температура °C") },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                OutlinedButton(
                    onClick = { tempC.toDoubleOrNull()?.let { vm.reportTemperature(orderId, it) } },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Отправить показание IoT") }
                Spacer(Modifier.height(8.dp))
                Button(onClick = { vm.arrived(orderId); step = 2 }, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                    Text("У двери")
                }
                TextButton(onClick = { vm.reportProblem(orderId, "address_not_found") }) { Text("← Проблема") }
            }
            2 -> {
                Text("Фото у двери (обязательно)")
                if (!photoCaptured) {
                    Button(
                        onClick = {
                            val file = File(context.cacheDir, "delivery-${orderId.take(8)}.jpg")
                            file.writeBytes(byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte()))
                            photoCaptured = true
                            vm.uploadAndDeliver(orderId, file, otp.ifBlank { null })
                            onDone()
                        },
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                    ) { Text("Сделать фото и доставить") }
                } else {
                    Text("Фото загружается в MinIO…")
                }
                OutlinedTextField(value = otp, onValueChange = { otp = it }, label = { Text("OTP клиента") }, modifier = Modifier.fillMaxWidth())
                Text("Только предоплаченные заказы (без COD)", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
fun StatsScreen(vm: CourierViewModel, onBack: () -> Unit) {
    LaunchedEffect(Unit) { vm.loadStats() }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        TextButton(onClick = onBack) { Text("← Назад") }
        vm.stats?.let { s ->
            Text("Сегодня: ${s["earnings_today"]} сум")
            Text("Неделя: ${s["earnings_week"]} сум")
            Text("Месяц: ${s["earnings_month"]} сум")
            Text("Доставок: ${s["deliveries_count"]}")
            Text("Рейтинг: ${s["rating"]}")
        }
    }
}