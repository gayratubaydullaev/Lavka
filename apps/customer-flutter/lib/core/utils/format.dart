import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

String formatPrice(int uzs) => '${NumberFormat('#,###', 'ru').format(uzs)} сум';
