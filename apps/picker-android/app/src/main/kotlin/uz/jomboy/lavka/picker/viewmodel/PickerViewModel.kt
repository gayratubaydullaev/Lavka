package uz.jomboy.lavka.picker.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import uz.jomboy.lavka.core.network.ApiClient
import uz.jomboy.lavka.core.network.CompleteRequest
import uz.jomboy.lavka.core.network.PickerTask
import uz.jomboy.lavka.core.network.PickerTaskItem
import uz.jomboy.lavka.core.network.ScanRequest
import uz.jomboy.lavka.picker.ble.BleScaleManager

class PickerViewModel : ViewModel() {
    private val api = ApiClient.createPickerApi("mock-jwt-picker")

    var isAuthenticated by mutableStateOf(false)
    var isOffline by mutableStateOf(false)
    var currentTask by mutableStateOf<PickerTask?>(null)
    var currentItemIndex by mutableIntStateOf(0)
    var scannedCount by mutableIntStateOf(0)
    var stats by mutableStateOf<Map<String, Any>?>(null)
    var error by mutableStateOf<String?>(null)
    var lastScanOk by mutableStateOf<Boolean?>(null)
    var aslVerified by mutableStateOf<Boolean?>(null)

    val sortedItems: List<PickerTaskItem>
        get() = currentTask?.items?.sortedBy { "ABCDEF".indexOf(it.zone.firstOrNull() ?: 'Z') } ?: emptyList()

    val currentItem: PickerTaskItem?
        get() = sortedItems.getOrNull(currentItemIndex)

    fun loadNextTask() {
        viewModelScope.launch {
            try {
                currentTask = api.getNextTask()
                currentItemIndex = 0
                scannedCount = 0
                isOffline = false
            } catch (e: Exception) {
                isOffline = true
                error = e.message
            }
        }
    }

    fun startTask() {
        val task = currentTask ?: return
        viewModelScope.launch {
            try {
                api.startTask(task.order_id)
            } catch (_) {
                isOffline = true
            }
        }
    }

    fun verifyAsl(code: String) {
        val item = currentItem ?: return
        viewModelScope.launch {
            try {
                val res = api.verifyAsl(mapOf("code" to code, "product_id" to item.product_id))
                aslVerified = res["valid"] as? Boolean ?: false
                isOffline = false
            } catch (_) {
                // offline cache stub: demo codes work without network
                aslVerified = code.startsWith("0104600")
                isOffline = true
            }
        }
    }

    fun scanBarcode(barcode: String) {
        val task = currentTask ?: return
        val item = currentItem ?: return
        val weight: Double? = if (item.is_weighted) {
            BleScaleManager.simulateReading(item.quantity.toDouble())
            BleScaleManager.currentWeight()
        } else null
        viewModelScope.launch {
            try {
                api.scan(task.order_id, ScanRequest(item.product_id, barcode, weight))
                lastScanOk = barcode == item.barcode
                if (lastScanOk == true) {
                    scannedCount++
                    if (currentItemIndex < sortedItems.size - 1) {
                        currentItemIndex++
                    }
                }
                isOffline = false
            } catch (e: Exception) {
                lastScanOk = false
                if (barcode == item.barcode) {
                    scannedCount++
                    if (currentItemIndex < sortedItems.size - 1) currentItemIndex++
                    isOffline = true
                }
            }
        }
    }

    fun complete(packageId: String, thermalBagId: String?) {
        val task = currentTask ?: return
        viewModelScope.launch {
            try {
                api.complete(
                    task.order_id,
                    CompleteRequest(
                        items_scanned = sortedItems.map { it.product_id },
                        package_id = packageId,
                        thermal_bag_id = thermalBagId,
                    ),
                )
                currentTask = null
            } catch (_) {
                isOffline = true
            }
        }
    }

    fun loadStats() {
        viewModelScope.launch {
            try {
                stats = api.stats()
            } catch (e: Exception) {
                error = e.message
            }
        }
    }
}
