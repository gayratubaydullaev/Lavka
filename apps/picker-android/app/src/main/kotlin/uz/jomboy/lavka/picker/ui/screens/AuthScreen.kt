package uz.jomboy.lavka.picker.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun AuthScreen(onAuthenticated: () -> Unit) {
    var phone by remember { mutableStateOf("+998901234567") }
    var otp by remember { mutableStateOf("1234") }
    var step by remember { mutableIntStateOf(0) }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Jomboy Сборщик", fontSize = 24.sp)
        Spacer(Modifier.height(32.dp))
        if (step == 0) {
            OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Телефон") })
            Spacer(Modifier.height(16.dp))
            Button(onClick = { step = 1 }, modifier = Modifier.fillMaxWidth().height(48.dp)) {
                Text("Получить код")
            }
        } else {
            OutlinedTextField(value = otp, onValueChange = { otp = it }, label = { Text("SMS (demo: 1234)") })
            Spacer(Modifier.height(16.dp))
            Button(onClick = onAuthenticated, modifier = Modifier.fillMaxWidth().height(48.dp)) {
                Text("Войти")
            }
        }
        Spacer(Modifier.height(16.dp))
        Text("Зоны сертификации: A, B, C, D, E, F", style = MaterialTheme.typography.bodySmall)
    }
}
