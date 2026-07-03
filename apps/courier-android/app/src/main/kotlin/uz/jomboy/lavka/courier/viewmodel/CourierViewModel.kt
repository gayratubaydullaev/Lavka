package uz.jomboy.lavka.courier.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import uz.jomboy.lavka.core.network.ApiClient
import uz.jomboy.lavka.core.network.CourierOffer
import uz.jomboy.lavka.core.network.DeliverRequest

class CourierViewModel : ViewModel() {
    private val api = ApiClient.createCourierApi("mock-jwt-courier")

    var isAuthenticated by mutableStateOf(false)
    var isOnline by mutableStateOf(false)
    var isOffline by mutableStateOf(false)
    var vehicleType by mutableStateOf("bicycle")
    var currentOffer by mutableStateOf<CourierOffer?>(null)
    var offerTimer by mutableIntStateOf(30)
    var activeOrders by mutableStateOf<List<Map<String, Any>>>(emptyList())
    var currentOrderId by mutableStateOf<String?>(null)
    var stats by mutableStateOf<Map<String, Any>?>(null)
    var heatmapZones by mutableStateOf<List<Map<String, Any>>>(emptyList())

    fun startShift(type: String) {
        vehicleType = type
        viewModelScope.launch {
            try {
                api.shift(mapOf("action" to "start", "vehicle_type" to type))
                isOnline = true
                pollOffers()
            } catch (_) {
                isOffline = true
                isOnline = true
            }
        }
    }

    fun stopShift() {
        viewModelScope.launch {
            try { api.shift(mapOf("action" to "stop")) } catch (_) {}
            isOnline = false
            currentOffer = null
        }
    }

    private fun pollOffers() {
        viewModelScope.launch {
            while (isOnline && currentOffer == null && activeOrders.isEmpty()) {
                try {
                    val res = api.getOffers()
                    currentOffer = res["offers"]?.firstOrNull()
                    offerTimer = 30
                    isOffline = false
                } catch (_) {
                    isOffline = true
                }
                delay(5000)
            }
        }
    }

    fun tickOfferTimer() {
        if (offerTimer > 0) offerTimer--
        else currentOffer = null
    }

    fun acceptOffer() {
        val offer = currentOffer ?: return
        viewModelScope.launch {
            try {
                api.acceptOffer(offer.order_id)
                currentOrderId = offer.order_id
                currentOffer = null
                loadActiveOrders()
            } catch (_) { isOffline = true }
        }
    }

    fun skipOffer() {
        val offer = currentOffer ?: return
        viewModelScope.launch {
            try { api.skipOffer(offer.order_id) } catch (_) {}
            currentOffer = null
        }
    }

    fun loadActiveOrders() {
        viewModelScope.launch {
            try {
                @Suppress("UNCHECKED_CAST")
                val res = api.activeOrders()["orders"] as? List<Map<String, Any>> ?: emptyList()
                activeOrders = res
                isOffline = false
            } catch (_) { isOffline = true }
        }
    }

    fun pickup(orderId: String) {
        viewModelScope.launch {
            try {
                api.pickup(orderId, mapOf("package_qr" to "PKG-SCAN"))
                loadActiveOrders()
            } catch (_) { isOffline = true }
        }
    }

    fun arrived(orderId: String) {
        viewModelScope.launch {
            try { api.arrived(orderId) } catch (_) { isOffline = true }
        }
    }

    fun reportTemperature(orderId: String, tempC: Double) {
        viewModelScope.launch {
            try {
                api.reportTemperature(
                    mapOf(
                        "order_id" to orderId,
                        "device_id" to "TB-C-001",
                        "temperature_c" to tempC,
                        "threshold_c" to 8,
                    ),
                )
            } catch (_) { isOffline = true }
        }
    }

    fun deliver(orderId: String, photoUrl: String, code: String?) {
        viewModelScope.launch {
            try {
                api.delivered(orderId, DeliverRequest(photoUrl, code))
                currentOrderId = null
                activeOrders = activeOrders.filter { (it["id"] as? String) != orderId }
                loadActiveOrders()
                pollOffers()
            } catch (_) { isOffline = true }
        }
    }

    fun uploadAndDeliver(orderId: String, photoFile: java.io.File, code: String?) {
        viewModelScope.launch {
            try {
                val part = MultipartBody.Part.createFormData(
                    "photo",
                    photoFile.name,
                    photoFile.asRequestBody("image/jpeg".toMediaType()),
                )
                val res = api.uploadPhoto(part)
                val url = res["photo_url"] as? String ?: return@launch
                deliver(orderId, url, code)
            } catch (_) {
                isOffline = true
                deliver(orderId, "http://localhost:9000/jomboy/delivery/${orderId.take(8)}.jpg", code)
            }
        }
    }

    fun reportProblem(orderId: String, type: String) {
        viewModelScope.launch {
            try { api.problem(orderId, mapOf("type" to type, "description" to "")) } catch (_) {}
        }
    }

    fun loadStats() {
        viewModelScope.launch {
            try { stats = api.stats() } catch (_) {}
        }
    }

    fun loadHeatmap() {
        viewModelScope.launch {
            try {
                @Suppress("UNCHECKED_CAST")
                val zones = api.getDemandHeatmap()["zones"] as? List<Map<String, Any>> ?: emptyList()
                heatmapZones = zones
                isOffline = false
            } catch (_) {
                isOffline = true
            }
        }
    }
}
