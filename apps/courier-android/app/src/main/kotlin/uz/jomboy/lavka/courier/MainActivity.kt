package uz.jomboy.lavka.courier

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.viewmodel.compose.viewModel
import uz.jomboy.lavka.courier.ui.CourierNavHost
import uz.jomboy.lavka.courier.viewmodel.CourierViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = MaterialTheme.colorScheme.copy(primary = Color(0xFF2E7D32))) {
                Surface(Modifier.fillMaxSize()) {
                    val vm: CourierViewModel = viewModel()
                    CourierNavHost(vm)
                }
            }
        }
    }
}
