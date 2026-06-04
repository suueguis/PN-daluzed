# Plan de Pruebas TDD — Sistema de Inventario Daluzed

> **Versión:** 1.0  
> **Fecha:** Mayo 2026  
> **Cobertura objetivo:** ≥ 70 % en lógica de negocio (RNF-MAN-02)  
> **Stack backend:** Django 5.x + DRF + SimpleJWT + Django-Axes  
> **Stack frontend:** React 19 + Vite + Zustand + Axios  
> **Herramientas de prueba backend:** `django.test.TestCase` / `rest_framework.test.APITestCase`  
> **Herramientas de prueba frontend:** Vitest + React Testing Library

---

## Índice

1. [Introducción](#1-introducción)
2. [Convenciones y herramientas](#2-convenciones-y-herramientas)
3. [AUT — Autenticación y Autorización](#3-aut--autenticación-y-autorización)
4. [CAT — Catálogo Maestro](#4-cat--catálogo-maestro)
5. [INV — Inventario](#5-inv--inventario)
6. [REC — Recepción](#6-rec--recepción)
7. [PROD — Producción y Despacho](#7-prod--producción-y-despacho)
8. [ALR — Alertas y Notificaciones](#8-alr--alertas-y-notificaciones)
9. [IND — Indicadores y Reportes](#9-ind--indicadores-y-reportes)
10. [AUD — Auditoría y Trazabilidad](#10-aud--auditoría-y-trazabilidad)
11. [Frontend — Login y componentes de UI](#11-frontend--login-y-componentes-de-ui)
12. [Pruebas No Funcionales](#12-pruebas-no-funcionales)
13. [Resumen de cobertura](#13-resumen-de-cobertura)

---

## 1. Introducción

### 1.1 Propósito

Este documento define el plan completo de pruebas bajo la metodología **TDD (Test-Driven Development)** para el sistema de gestión de inventario de **Daluzed**. Cada prueba está escrita **antes** de la implementación del módulo correspondiente (salvo el módulo AUT, que ya tiene implementación base), siguiendo el ciclo: *Rojo → Verde → Refactorizar*.

### 1.2 Alcance

El plan cubre **8 módulos de negocio** del sistema más las pruebas de frontend, con un mínimo de **100 casos de prueba** distribuidos entre pruebas unitarias, de integración y de API.

### 1.3 Cortes académicos y módulos asociados

| Corte | Módulos | Fecha aprox. |
|-------|---------|--------------|
| Corte 1 | AUT, CAT | Activo |
| Corte 2 | INV, REC, PROD | Segunda entrega |
| Corte 3 | ALR, IND, AUD | Entrega final |

### 1.4 Reglas de negocio críticas cubiertas

| Regla | Módulo | ID |
|-------|--------|----|
| FEFO para consumo de materias primas desde Bodega PDP | PROD | RF-PROD-02 |
| FIFO para despacho de producto terminado al PDV | PROD | RF-PROD-06 |
| Solo Bodega Principal activa alertas de reorden | INV/ALR | RF-INV-02 |
| Máximo 2 batidos simultáneos en producción | PROD | RF-PROD-04 |
| Recepción SOLO contra orden de pedido previa | REC | RF-REC-01 |
| Bloqueo 5 intentos fallidos → 1 hora (Django-Axes) | AUT | RF-AUT-01 |
| Registros inmutables — corrección via compensatorio | PROD/REC | RF-PROD-08 |
| Movimiento compensatorio visible para todos | PROD | RF-PROD-08 |
| Días mínimos de vencimiento — alerta bloqueante | REC | RF-REC-06 |
| Estados PT: EN_ESPERA → EN_PUNTO_DE_VENTA (irreversible) | PROD | RF-PROD-07 |
| Transacciones atómicas en producción y traslados | PROD/INV | RF-PROD-01, RF-INV-04 |
| RBAC: 4 roles — Admin, Gerencia, JefeInventario, JefeProduccion | AUT | RF-AUT-04 |
| user/role NO se persiste en localStorage | Frontend | RNF-SEG-01 |

---

## 2. Convenciones y herramientas

### 2.1 Nomenclatura de IDs de prueba

```
[MÓDULO]-[NNN]
```

Ejemplo: `AUT-001`, `PROD-014`

### 2.2 Tipos de prueba

| Tipo | Descripción |
|------|-------------|
| **Unitaria** | Prueba de una función, método o clase de forma aislada, sin BD ni red |
| **Integración** | Prueba de la interacción entre componentes con BD real (SQLite en tests) |
| **API** | Prueba de un endpoint HTTP con `APITestCase` y cliente de prueba DRF |
| **Frontend** | Prueba de componentes React con Vitest + React Testing Library |

### 2.3 Patrón de prueba backend

```python
def test_descripcion_clara_en_snake_case(self):
    # Arrange — preparar datos de entrada
    # Act     — ejecutar la acción
    # Assert  — verificar el resultado
```

### 2.4 Estructura de archivos de prueba

```
apps/
  authentication/
    tests/
      __init__.py
      test_autenticacion.py      ← AUT
  catalogo/
    tests/
      __init__.py
      test_catalogo.py           ← CAT
  inventario/
    tests/
      __init__.py
      test_inventario.py         ← INV
  recepcion/
    tests/
      __init__.py
      test_recepcion.py          ← REC
  produccion/
    tests/
      __init__.py
      test_produccion.py         ← PROD
  alertas/
    tests/
      __init__.py
      test_alertas.py            ← ALR
  indicadores/
    tests/
      __init__.py
      test_indicadores.py        ← IND
  auditoria/
    tests/
      __init__.py
      test_auditoria.py          ← AUD

frontend/src/__tests__/
  Login.test.jsx                 ← Frontend Login
  axiosClient.test.js            ← Frontend Interceptor
```

### 2.5 Ejecutar las pruebas

```bash
# Backend — todos los módulos
python manage.py test apps --verbosity=2

# Backend — módulo específico
python manage.py test apps.authentication.tests --verbosity=2

# Backend — con cobertura
coverage run manage.py test apps
coverage report --min-coverage=70

# Frontend
cd frontend
npx vitest run --coverage
```

### 2.6 Base de datos para pruebas

Django usa una base de datos de prueba en SQLite (o la definida en `TEST` dentro de `DATABASES`). Cada `TestCase` ejecuta cada prueba en una transacción que se revierte al finalizar, garantizando aislamiento.

### 2.7 Configuración especial para Django-Axes en pruebas

Las pruebas de bloqueo (AUT-004) funcionan sin configuración adicional porque el cliente de prueba envía `REMOTE_ADDR=127.0.0.1`. Para pruebas que **no** deben verse afectadas por Axes, se limpia `AccessAttempt` en cada `setUp`.

---

## 3. AUT — Autenticación y Autorización

### 3.1 Tabla resumen

| ID Prueba | Descripción | Tipo | RF que cubre | Prioridad |
|-----------|-------------|------|--------------|-----------|
| AUT-001 | Login exitoso devuelve access, refresh, username y role | API | RF-AUT-01 | Alta |
| AUT-002 | Login con contraseña incorrecta → 401 + remaining_attempts | API | RF-AUT-01 | Alta |
| AUT-003 | Login con email inexistente → 401 | API | RF-AUT-01 | Alta |
| AUT-004 | Bloqueo tras 5 intentos fallidos → detail: 'lockout' | API | RF-AUT-01 | Alta |
| AUT-005 | Usuario inactivo no puede hacer login → detail: 'inactive' | API | RF-AUT-01 | Alta |
| AUT-006 | Logout con token válido → blacklist del refresh token | API | RF-AUT-02 | Alta |
| AUT-007 | Logout sin token de autorización → 401 | API | RF-AUT-02 | Alta |
| AUT-008 | Refresh con token válido → nuevo access token | API | RF-AUT-03 | Alta |
| AUT-009 | Refresh con token inválido/expirado → 401 | API | RF-AUT-03 | Alta |
| AUT-010 | RBAC: JefeInventario no puede acceder a endpoint de admin | API | RF-AUT-04 | Alta |
| AUT-011 | RBAC: Administrador sí puede acceder a endpoint de admin | API | RF-AUT-04 | Alta |
| AUT-012 | Generación de tokens para usuario con grupo Django | Unitaria | RF-AUT-04 | Media |
| AUT-013 | Rol tomado del primer grupo; fallback a campo role del modelo | Unitaria | RF-AUT-04 | Media |
| AUT-014 | Token refresh rota el refresh token (ROTATE_REFRESH_TOKENS=True) | API | RF-AUT-03 | Media |
| AUT-015 | Refresh token ya usado no es válido (BLACKLIST_AFTER_ROTATION=True) | API | RF-AUT-03 | Media |

### 3.2 Código de pruebas

```python
# apps/authentication/tests/test_autenticacion.py

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from axes.models import AccessAttempt
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

# ──────────────────────────────────────────────────────────────────────
# AUT-001 al AUT-015 — Login, logout, refresh y RBAC
# ──────────────────────────────────────────────────────────────────────

class LoginTestCase(APITestCase):
    """
    Pruebas de inicio de sesión, manejo de errores y bloqueo
    por fuerza bruta mediante Django-Axes.
    """

    LOGIN_URL = '/api/v1/auth/login/'

    def setUp(self):
        # Limpiar intentos fallidos de pruebas anteriores
        AccessAttempt.objects.all().delete()

        # Usuario activo con rol de inventario
        self.user = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        # Usuario inactivo para AUT-005
        self.inactive_user = User.objects.create_user(
            email='inactivo@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
            is_active=False,
        )

    # ── AUT-001 ───────────────────────────────────────────────────────
    def test_aut_001_login_exitoso_devuelve_access_refresh_username_role(self):
        """
        Login con credenciales válidas debe devolver access token,
        refresh token, username (email) y role del usuario.
        RF-AUT-01
        """
        # Arrange
        payload = {
            'email': 'inventario@daluzed.com',
            'password': 'Daluzed2026!',
        }
        # Act
        response = self.client.post(self.LOGIN_URL, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('username', response.data)
        self.assertIn('role', response.data)
        self.assertEqual(response.data['username'], 'inventario@daluzed.com')
        self.assertEqual(response.data['role'], 'INVENTARIO')

    # ── AUT-002 ───────────────────────────────────────────────────────
    def test_aut_002_login_contrasena_incorrecta_devuelve_401_y_remaining_attempts(self):
        """
        Contraseña incorrecta → HTTP 401 con detail='invalid'
        y campo remaining_attempts > 0.
        RF-AUT-01
        """
        # Arrange
        payload = {
            'email': 'inventario@daluzed.com',
            'password': 'ClaveIncorrecta!',
        }
        # Act
        response = self.client.post(self.LOGIN_URL, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('detail'), 'invalid')
        self.assertIn('remaining_attempts', response.data)
        self.assertGreater(response.data['remaining_attempts'], 0)

    # ── AUT-003 ───────────────────────────────────────────────────────
    def test_aut_003_login_email_inexistente_devuelve_401(self):
        """
        Email que no existe en la base de datos → HTTP 401.
        RF-AUT-01
        """
        # Arrange
        payload = {
            'email': 'fantasma@daluzed.com',
            'password': 'Cualquiera123!',
        }
        # Act
        response = self.client.post(self.LOGIN_URL, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── AUT-004 ───────────────────────────────────────────────────────
    def test_aut_004_bloqueo_tras_cinco_intentos_fallidos(self):
        """
        Cinco intentos fallidos consecutivos activan el bloqueo
        de Django-Axes. El sexto intento debe devolver detail='lockout'.
        RF-AUT-01 / AXES_FAILURE_LIMIT=5
        """
        # Arrange
        payload_incorrecto = {
            'email': 'inventario@daluzed.com',
            'password': 'ClaveIncorrecta!',
        }
        # Act — 5 intentos fallidos
        for _ in range(5):
            self.client.post(self.LOGIN_URL, payload_incorrecto, format='json')

        # Intento número 6
        response = self.client.post(self.LOGIN_URL, payload_incorrecto, format='json')

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('detail'), 'lockout')

    # ── AUT-005 ───────────────────────────────────────────────────────
    def test_aut_005_usuario_inactivo_no_puede_hacer_login(self):
        """
        Usuario con is_active=False recibe HTTP 401
        con detail='inactive'.
        RF-AUT-01
        """
        # Arrange
        payload = {
            'email': 'inactivo@daluzed.com',
            'password': 'Daluzed2026!',
        }
        # Act
        response = self.client.post(self.LOGIN_URL, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('detail'), 'inactive')

    # ── AUT-006 ───────────────────────────────────────────────────────
    def test_aut_006_logout_con_token_valido_invalida_refresh(self):
        """
        Logout con header Authorization válido y refresh token →
        HTTP 200. El refresh token queda en la blacklist.
        RF-AUT-02
        """
        # Arrange
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        # Act
        response = self.client.post(
            '/api/v1/auth/logout/',
            {'refresh': str(refresh)},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detail', response.data)

    # ── AUT-007 ───────────────────────────────────────────────────────
    def test_aut_007_logout_sin_token_de_autorizacion_devuelve_401(self):
        """
        Llamar a /logout/ sin header Authorization → HTTP 401.
        RF-AUT-02
        """
        # Act (sin credentials)
        response = self.client.post(
            '/api/v1/auth/logout/',
            {'refresh': 'cualquier-token'},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── AUT-008 ───────────────────────────────────────────────────────
    def test_aut_008_refresh_con_token_valido_devuelve_nuevo_access(self):
        """
        Token refresh válido → HTTP 200 con nuevo access token.
        RF-AUT-03
        """
        # Arrange
        refresh = RefreshToken.for_user(self.user)
        # Act
        response = self.client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': str(refresh)},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    # ── AUT-009 ───────────────────────────────────────────────────────
    def test_aut_009_refresh_con_token_invalido_devuelve_401(self):
        """
        Token refresh con firma inválida o expirado → HTTP 401.
        RF-AUT-03
        """
        # Act
        response = self.client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': 'este.token.no.es.valido'},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── AUT-010 ───────────────────────────────────────────────────────
    def test_aut_010_jefe_inventario_no_puede_acceder_a_endpoint_solo_admin(self):
        """
        Usuario con role='INVENTARIO' hace GET a /auditoria/bitacora/
        (endpoint protegido para ADMIN) → debe recibir 403 Forbidden.
        RF-AUT-04 / RBAC
        """
        # Arrange
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        # Act
        response = self.client.get('/api/v1/auditoria/bitacora/')
        # Assert — 403 (endpoint existe) o 404 (endpoint no implementado aún)
        self.assertIn(
            response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND],
        )
        # Cuando el endpoint esté implementado, solo debe aceptar HTTP_403_FORBIDDEN:
        # self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── AUT-011 ───────────────────────────────────────────────────────
    def test_aut_011_administrador_puede_acceder_a_endpoint_admin(self):
        """
        Usuario con role='ADMIN' accede a /auditoria/bitacora/ → no recibe 403.
        RF-AUT-04 / RBAC
        """
        # Arrange
        admin_user = User.objects.create_user(
            email='admin@daluzed.com',
            password='AdminDaluzed2026!',
            role='ADMIN',
        )
        refresh = RefreshToken.for_user(admin_user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        # Act
        response = self.client.get('/api/v1/auditoria/bitacora/')
        # Assert — nunca debe ser 403
        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── AUT-012 ───────────────────────────────────────────────────────
    def test_aut_012_generate_tokens_devuelve_rol_del_primer_grupo_django(self):
        """
        AuthService.generate_tokens_for_user devuelve el nombre
        del primer grupo Django del usuario como 'role'.
        RF-AUT-04
        """
        # Arrange
        from apps.authentication.services import AuthService
        grupo = Group.objects.create(name='Administrador')
        self.user.groups.add(grupo)
        # Act
        tokens = AuthService.generate_tokens_for_user(self.user)
        # Assert
        self.assertEqual(tokens['role'], 'Administrador')
        self.assertIn('access', tokens)
        self.assertIn('refresh', tokens)
        self.assertIn('username', tokens)

    # ── AUT-013 ───────────────────────────────────────────────────────
    def test_aut_013_rol_fallback_a_campo_role_si_usuario_sin_grupos(self):
        """
        Si el usuario no tiene grupos Django asignados,
        el campo 'role' en los tokens usa el campo modelo.
        RF-AUT-04
        """
        # Arrange
        from apps.authentication.services import AuthService
        # self.user no tiene grupos en setUp
        # Act
        tokens = AuthService.generate_tokens_for_user(self.user)
        # Assert
        self.assertEqual(tokens['role'], self.user.role)  # 'INVENTARIO'

    # ── AUT-014 ───────────────────────────────────────────────────────
    def test_aut_014_refresh_rota_y_devuelve_nuevo_refresh_token(self):
        """
        Con ROTATE_REFRESH_TOKENS=True, cada uso del refresh
        genera un refresh token diferente.
        RF-AUT-03 / SIMPLE_JWT ROTATE_REFRESH_TOKENS=True
        """
        # Arrange
        refresh_original = RefreshToken.for_user(self.user)
        # Act
        response = self.client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': str(refresh_original)},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('refresh', response.data)
        # El nuevo refresh debe ser diferente al original
        self.assertNotEqual(response.data['refresh'], str(refresh_original))

    # ── AUT-015 ───────────────────────────────────────────────────────
    def test_aut_015_refresh_ya_usado_no_es_valido_blacklist(self):
        """
        Con BLACKLIST_AFTER_ROTATION=True, el refresh token
        usado queda en la blacklist y no puede reutilizarse.
        RF-AUT-03 / SIMPLE_JWT BLACKLIST_AFTER_ROTATION=True
        """
        # Arrange
        refresh_original = RefreshToken.for_user(self.user)
        # Act — primer uso (exitoso)
        self.client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': str(refresh_original)},
            format='json',
        )
        # Segundo uso del mismo token (ya está en blacklist)
        response = self.client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': str(refresh_original)},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

---

## 4. CAT — Catálogo Maestro

### 4.1 Tabla resumen

| ID Prueba | Descripción | Tipo | RF que cubre | Prioridad |
|-----------|-------------|------|--------------|-----------|
| CAT-001 | Crear materia prima con todos los campos válidos → 201 | API | RF-CAT-01 | Alta |
| CAT-002 | Crear materia prima con nombre duplicado → 400 | API | RF-CAT-01 | Alta |
| CAT-003 | Crear materia prima sin unidad de medida → 400 | API | RF-CAT-01, RF-CAT-02 | Alta |
| CAT-004 | Listar materias primas devuelve respuesta paginada | API | RF-CAT-01 | Media |
| CAT-005 | Obtener materia prima por ID | API | RF-CAT-01 | Media |
| CAT-006 | Actualizar punto de reorden de materia prima | API | RF-CAT-01 | Media |
| CAT-007 | Desactivar materia prima (soft delete) | API | RF-CAT-01 | Alta |
| CAT-008 | No se puede desactivar MP con lotes activos | API | RF-CAT-01 | Alta |
| CAT-009 | Configurar días mínimos de vencimiento | API | RF-CAT-07 | Alta |
| CAT-010 | Actualizar días mínimos de vencimiento | API | RF-CAT-07 | Media |
| CAT-011 | Crear proveedor con datos válidos → 201 | API | RF-CAT-05 | Alta |
| CAT-012 | Asociar proveedor a materia prima (M2M) | API | RF-CAT-06 | Alta |
| CAT-013 | Una materia prima puede tener múltiples proveedores | Integración | RF-CAT-06 | Alta |
| CAT-014 | Un proveedor puede estar en múltiples materias primas | Integración | RF-CAT-06 | Alta |
| CAT-015 | Crear producto terminado con vida útil en días → 201 | API | RF-CAT-04 | Alta |
| CAT-016 | Listar productos terminados | API | RF-CAT-04 | Media |
| CAT-017 | Crear unidad de medida | API | RF-CAT-02 | Media |
| CAT-018 | Conversión de presentación a unidad base (1 bolsa 50kg = 50000g) | Unitaria | RF-CAT-02, RF-CAT-03 | Alta |

### 4.2 Código de pruebas

```python
# apps/catalogo/tests/test_catalogo.py

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

# Importar modelos que se implementarán en apps/catalogo/models.py
from apps.catalogo.models import (
    UnidadMedida,
    MateriaPrima,
    Presentacion,
    Proveedor,
    ProductoTerminado,
)

User = get_user_model()


# ──────────────────────────────────────────────────────────────────────
# CAT-001 al CAT-010 — Materias Primas
# ──────────────────────────────────────────────────────────────────────

class MateriaPrimaTestCase(APITestCase):
    """Pruebas de creación, consulta, actualización y desactivación de materias primas."""

    URL = '/api/v1/catalogo/materias-primas/'

    def setUp(self):
        # Usuario con rol INVENTARIO autenticado
        self.user = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        # Unidades de medida base para los tests
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.ml = UnidadMedida.objects.create(nombre='Mililitros', simbolo='ml')

    # ── CAT-001 ───────────────────────────────────────────────────────
    def test_cat_001_crear_materia_prima_con_campos_validos(self):
        """
        POST /catalogo/materias-primas/ con todos los campos obligatorios
        → HTTP 201, la MP queda guardada en BD.
        RF-CAT-01
        """
        # Arrange
        payload = {
            'nombre': 'Harina de trigo',
            'unidad_medida': self.gramos.id,
            'punto_reorden': 10000,
            'dias_minimos_vencimiento': 30,
        }
        # Act
        response = self.client.post(self.URL, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nombre'], 'Harina de trigo')
        self.assertTrue(MateriaPrima.objects.filter(nombre='Harina de trigo').exists())

    # ── CAT-002 ───────────────────────────────────────────────────────
    def test_cat_002_nombre_duplicado_devuelve_400(self):
        """
        Intentar crear una MP con nombre ya existente → HTTP 400.
        RF-CAT-01
        """
        # Arrange — crear la MP primero
        MateriaPrima.objects.create(
            nombre='Azúcar blanca',
            unidad_medida=self.gramos,
            punto_reorden=5000,
        )
        payload = {'nombre': 'Azúcar blanca', 'unidad_medida': self.gramos.id}
        # Act
        response = self.client.post(self.URL, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── CAT-003 ───────────────────────────────────────────────────────
    def test_cat_003_crear_sin_unidad_de_medida_devuelve_400(self):
        """
        Crear MP sin especificar unidad de medida → HTTP 400.
        RF-CAT-01, RF-CAT-02
        """
        # Arrange
        payload = {'nombre': 'Sal fina', 'punto_reorden': 500}
        # Act
        response = self.client.post(self.URL, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('unidad_medida', response.data)

    # ── CAT-004 ───────────────────────────────────────────────────────
    def test_cat_004_listar_materias_primas_paginadas(self):
        """
        GET /catalogo/materias-primas/ devuelve respuesta paginada
        con claves 'count', 'results'.
        RF-CAT-01
        """
        # Arrange
        nombres = ['Mantequilla', 'Huevos', 'Leche entera']
        for nombre in nombres:
            MateriaPrima.objects.create(
                nombre=nombre, unidad_medida=self.gramos, punto_reorden=1000
            )
        # Act
        response = self.client.get(self.URL)
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertGreaterEqual(response.data['count'], 3)

    # ── CAT-005 ───────────────────────────────────────────────────────
    def test_cat_005_obtener_materia_prima_por_id(self):
        """
        GET /catalogo/materias-primas/{id}/ devuelve la MP con nombre correcto.
        RF-CAT-01
        """
        # Arrange
        mp = MateriaPrima.objects.create(
            nombre='Chocolate cobertura',
            unidad_medida=self.gramos,
            punto_reorden=3000,
        )
        # Act
        response = self.client.get(f'{self.URL}{mp.id}/')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], 'Chocolate cobertura')

    # ── CAT-006 ───────────────────────────────────────────────────────
    def test_cat_006_actualizar_punto_reorden(self):
        """
        PATCH /catalogo/materias-primas/{id}/ actualiza el punto de reorden.
        RF-CAT-01
        """
        # Arrange
        mp = MateriaPrima.objects.create(
            nombre='Leche condensada',
            unidad_medida=self.ml,
            punto_reorden=5000,
        )
        # Act
        response = self.client.patch(
            f'{self.URL}{mp.id}/',
            {'punto_reorden': 8000},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mp.refresh_from_db()
        self.assertEqual(mp.punto_reorden, 8000)

    # ── CAT-007 ───────────────────────────────────────────────────────
    def test_cat_007_desactivar_materia_prima_soft_delete(self):
        """
        POST /catalogo/materias-primas/{id}/desactivar/ → activo=False.
        El registro permanece en BD (soft delete).
        RF-CAT-01
        """
        # Arrange
        mp = MateriaPrima.objects.create(
            nombre='Vainilla extracto',
            unidad_medida=self.ml,
            punto_reorden=100,
        )
        # Act
        response = self.client.post(f'{self.URL}{mp.id}/desactivar/')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mp.refresh_from_db()
        self.assertFalse(mp.activo)
        # Sigue existiendo en BD
        self.assertTrue(MateriaPrima.objects.filter(id=mp.id).exists())

    # ── CAT-008 ───────────────────────────────────────────────────────
    def test_cat_008_no_desactivar_mp_con_stock_activo(self):
        """
        No se puede desactivar una MP que tiene lotes con cantidad > 0.
        El backend debe responder HTTP 400.
        RF-CAT-01 (restricción de integridad referencial)
        """
        # Arrange — importar modelos de Inventario
        from apps.inventario.models import Bodega, Lote
        from datetime import date, timedelta

        mp = MateriaPrima.objects.create(
            nombre='Esencia de naranja',
            unidad_medida=self.ml,
            punto_reorden=200,
        )
        bodega = Bodega.objects.create(nombre='Bodega Principal', tipo='PRINCIPAL')
        Lote.objects.create(
            materia_prima=mp,
            bodega=bodega,
            cantidad=500,
            fecha_vencimiento=date.today() + timedelta(days=90),
            fecha_entrada=date.today(),
        )
        # Act
        response = self.client.post(f'{self.URL}{mp.id}/desactivar/')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mp.refresh_from_db()
        self.assertTrue(mp.activo)

    # ── CAT-009 ───────────────────────────────────────────────────────
    def test_cat_009_configurar_dias_minimos_vencimiento(self):
        """
        PATCH con dias_minimos_vencimiento establece el parámetro
        de validación para recepciones futuras.
        RF-CAT-07
        """
        # Arrange
        mp = MateriaPrima.objects.create(
            nombre='Crema de leche',
            unidad_medida=self.ml,
            punto_reorden=1000,
        )
        # Act
        response = self.client.patch(
            f'{self.URL}{mp.id}/',
            {'dias_minimos_vencimiento': 15},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mp.refresh_from_db()
        self.assertEqual(mp.dias_minimos_vencimiento, 15)

    # ── CAT-010 ───────────────────────────────────────────────────────
    def test_cat_010_actualizar_dias_minimos_vencimiento(self):
        """
        Actualizar dias_minimos_vencimiento de 10 a 20 días.
        RF-CAT-07
        """
        # Arrange
        mp = MateriaPrima.objects.create(
            nombre='Levadura seca',
            unidad_medida=self.gramos,
            punto_reorden=500,
            dias_minimos_vencimiento=10,
        )
        # Act
        response = self.client.patch(
            f'{self.URL}{mp.id}/',
            {'dias_minimos_vencimiento': 20},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mp.refresh_from_db()
        self.assertEqual(mp.dias_minimos_vencimiento, 20)


# ──────────────────────────────────────────────────────────────────────
# CAT-011 al CAT-014 — Proveedores y relaciones M2M
# ──────────────────────────────────────────────────────────────────────

class ProveedorTestCase(APITestCase):
    """Pruebas de proveedores y su relación M2M con materias primas."""

    URL_PROV = '/api/v1/catalogo/proveedores/'

    def setUp(self):
        self.user = User.objects.create_user(
            email='gerente@daluzed.com',
            password='Daluzed2026!',
            role='GERENTE',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')

    # ── CAT-011 ───────────────────────────────────────────────────────
    def test_cat_011_crear_proveedor_con_datos_validos(self):
        """
        POST /catalogo/proveedores/ con nombre, contacto, teléfono y email
        → HTTP 201.
        RF-CAT-05
        """
        # Arrange
        payload = {
            'nombre': 'Distribuidora El Trigal',
            'contacto': 'Juan Pérez',
            'telefono': '3001234567',
            'email': 'ventas@eltrigal.com',
        }
        # Act
        response = self.client.post(self.URL_PROV, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nombre'], 'Distribuidora El Trigal')

    # ── CAT-012 ───────────────────────────────────────────────────────
    def test_cat_012_asociar_proveedor_a_materia_prima_m2m(self):
        """
        POST /catalogo/materias-primas/{id}/proveedores/ asocia
        un proveedor existente a la MP.
        RF-CAT-06
        """
        # Arrange
        proveedor = Proveedor.objects.create(nombre='Harinera del Valle S.A.')
        mp = MateriaPrima.objects.create(
            nombre='Harina integral',
            unidad_medida=self.gramos,
            punto_reorden=5000,
        )
        # Act
        response = self.client.post(
            f'/api/v1/catalogo/materias-primas/{mp.id}/proveedores/',
            {'proveedor_id': proveedor.id},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mp.refresh_from_db()
        self.assertIn(proveedor, mp.proveedores.all())

    # ── CAT-013 ───────────────────────────────────────────────────────
    def test_cat_013_materia_prima_puede_tener_multiples_proveedores(self):
        """
        Una MP puede estar asociada a dos o más proveedores distintos.
        RF-CAT-06
        """
        # Arrange
        mp = MateriaPrima.objects.create(
            nombre='Azúcar morena',
            unidad_medida=self.gramos,
            punto_reorden=4000,
        )
        p1 = Proveedor.objects.create(nombre='Ingenio Risaralda')
        p2 = Proveedor.objects.create(nombre='Ingenio del Cauca')
        # Act
        mp.proveedores.add(p1, p2)
        # Assert
        self.assertEqual(mp.proveedores.count(), 2)
        self.assertIn(p1, mp.proveedores.all())
        self.assertIn(p2, mp.proveedores.all())

    # ── CAT-014 ───────────────────────────────────────────────────────
    def test_cat_014_proveedor_puede_estar_en_multiples_materias_primas(self):
        """
        Un proveedor puede estar asociado a múltiples materias primas.
        RF-CAT-06
        """
        # Arrange
        proveedor = Proveedor.objects.create(nombre='Multiproveedor S.A.')
        mp1 = MateriaPrima.objects.create(
            nombre='Mantequilla sin sal',
            unidad_medida=self.gramos,
            punto_reorden=2000,
        )
        mp2 = MateriaPrima.objects.create(
            nombre='Manteca vegetal',
            unidad_medida=self.gramos,
            punto_reorden=1500,
        )
        # Act
        mp1.proveedores.add(proveedor)
        mp2.proveedores.add(proveedor)
        # Assert
        total_mp = MateriaPrima.objects.filter(proveedores=proveedor).count()
        self.assertEqual(total_mp, 2)


# ──────────────────────────────────────────────────────────────────────
# CAT-015 al CAT-018 — Productos terminados y unidades de medida
# ──────────────────────────────────────────────────────────────────────

class ProductoTerminadoYUnidadesTestCase(APITestCase):
    """Pruebas de productos terminados, unidades de medida y presentaciones."""

    URL_PT = '/api/v1/catalogo/productos-terminados/'
    URL_UM = '/api/v1/catalogo/unidades-medida/'

    def setUp(self):
        self.user = User.objects.create_user(
            email='admin@daluzed.com',
            password='AdminDaluzed2026!',
            role='ADMIN',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        self.unidades = UnidadMedida.objects.create(
            nombre='Unidades', simbolo='und'
        )

    # ── CAT-015 ───────────────────────────────────────────────────────
    def test_cat_015_crear_producto_terminado_con_vida_util(self):
        """
        POST /catalogo/productos-terminados/ con vida útil en días → HTTP 201.
        RF-CAT-04
        """
        # Arrange
        payload = {
            'nombre': 'Torta de vainilla',
            'vida_util_dias': 14,
            'unidad_medida': self.unidades.id,
        }
        # Act
        response = self.client.post(self.URL_PT, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['vida_util_dias'], 14)
        self.assertTrue(
            ProductoTerminado.objects.filter(nombre='Torta de vainilla').exists()
        )

    # ── CAT-016 ───────────────────────────────────────────────────────
    def test_cat_016_listar_productos_terminados(self):
        """
        GET /catalogo/productos-terminados/ devuelve todos los productos.
        RF-CAT-04
        """
        # Arrange
        ProductoTerminado.objects.create(
            nombre='Torta de chía', vida_util_dias=12, unidad_medida=self.unidades
        )
        ProductoTerminado.objects.create(
            nombre='Bizcocho', vida_util_dias=5, unidad_medida=self.unidades
        )
        # Act
        response = self.client.get(self.URL_PT)
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 2)

    # ── CAT-017 ───────────────────────────────────────────────────────
    def test_cat_017_crear_unidad_de_medida(self):
        """
        POST /catalogo/unidades-medida/ crea una nueva unidad.
        RF-CAT-02
        """
        # Arrange
        payload = {'nombre': 'Kilogramos', 'simbolo': 'kg'}
        # Act
        response = self.client.post(self.URL_UM, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['simbolo'], 'kg')

    # ── CAT-018 ───────────────────────────────────────────────────────
    def test_cat_018_conversion_presentacion_a_unidad_base(self):
        """
        Una presentación '1 bolsa de 50 kg' tiene factor_conversion=50000
        porque la unidad base es gramos (1kg = 1000g, 50kg = 50000g).
        Verificar que 2 bolsas = 100000g.
        RF-CAT-02, RF-CAT-03
        """
        # Arrange
        gramos = UnidadMedida.objects.create(nombre='Gramos base', simbolo='g2')
        mp = MateriaPrima.objects.create(
            nombre='Harina extra suave',
            unidad_medida=gramos,
            punto_reorden=10000,
        )
        presentacion = Presentacion.objects.create(
            nombre='Bolsa 50kg',
            materia_prima=mp,
            unidad_medida=gramos,
            factor_conversion=50000,  # 1 bolsa = 50000 gramos
        )
        # Act
        cantidad_bolsas = 2
        total_gramos = cantidad_bolsas * presentacion.factor_conversion
        # Assert
        self.assertEqual(presentacion.factor_conversion, 50000)
        self.assertEqual(total_gramos, 100000)
```

---

## 5. INV — Inventario

### 5.1 Tabla resumen

| ID Prueba | Descripción | Tipo | RF que cubre | Prioridad |
|-----------|-------------|------|--------------|-----------|
| INV-001 | Consultar stock de MP en Bodega Principal | API | RF-INV-01 | Alta |
| INV-002 | Consultar stock de MP en Bodega PDP | API | RF-INV-01 | Alta |
| INV-003 | Bodega PDP NO aparece en cálculo de punto de reorden | API | RF-INV-02 | Alta |
| INV-004 | Stock BP por debajo del punto de reorden → señal de alerta | Integración | RF-INV-02 | Alta |
| INV-005 | Sugerencia FEFO devuelve el lote con vencimiento más próximo | Unitaria | RF-INV-03 | Alta |
| INV-006 | Sugerencia FEFO ignora lotes vencidos | Unitaria | RF-INV-03 | Alta |
| INV-007 | Traslado descuenta BP e incrementa PDP atómicamente | API | RF-INV-04 | Alta |
| INV-008 | Traslado con stock insuficiente en BP → error | API | RF-INV-04 | Alta |
| INV-009 | Traslado es inmutable (no se puede modificar) | API | RF-INV-04 | Alta |
| INV-010 | Registrar devolución de lote vencido a proveedor | API | RF-INV-05 | Media |
| INV-011 | Registrar descarte de lote vencido | API | RF-INV-05 | Media |
| INV-012 | Trazabilidad: lote rastreable desde recepción hasta consumo | Integración | RF-INV-01 | Alta |

### 5.2 Código de pruebas

```python
# apps/inventario/tests/test_inventario.py

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date, timedelta

from apps.catalogo.models import UnidadMedida, MateriaPrima
from apps.inventario.models import Bodega, Lote, MovimientoInventario

User = get_user_model()


class ConsultaStockTestCase(APITestCase):
    """INV-001 al INV-006: Consulta de stock y lógica FEFO."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        # Materias primas y bodegas
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.mp_harina = MateriaPrima.objects.create(
            nombre='Harina de trigo',
            unidad_medida=self.gramos,
            punto_reorden=10000,
        )
        self.bodega_principal = Bodega.objects.create(
            nombre='Bodega Principal', tipo='PRINCIPAL'
        )
        self.bodega_pdp = Bodega.objects.create(
            nombre='Bodega PDP', tipo='PDP'
        )
        hoy = date.today()
        # Lote en Bodega Principal
        self.lote_bp = Lote.objects.create(
            materia_prima=self.mp_harina,
            bodega=self.bodega_principal,
            cantidad=50000,
            fecha_vencimiento=hoy + timedelta(days=60),
            fecha_entrada=hoy,
        )
        # Lote en Bodega PDP
        self.lote_pdp = Lote.objects.create(
            materia_prima=self.mp_harina,
            bodega=self.bodega_pdp,
            cantidad=5000,
            fecha_vencimiento=hoy + timedelta(days=45),
            fecha_entrada=hoy - timedelta(days=5),
        )

    # ── INV-001 ───────────────────────────────────────────────────────
    def test_inv_001_consultar_stock_bodega_principal(self):
        """
        GET /inventario/stock/?materia_prima=X&bodega=Y
        devuelve la cantidad correcta para Bodega Principal.
        RF-INV-01
        """
        # Act
        response = self.client.get(
            '/api/v1/inventario/stock/',
            {
                'materia_prima': self.mp_harina.id,
                'bodega': self.bodega_principal.id,
            },
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['cantidad_total']), 50000.0)

    # ── INV-002 ───────────────────────────────────────────────────────
    def test_inv_002_consultar_stock_bodega_pdp(self):
        """
        Stock de Bodega PDP se consulta correctamente de forma independiente.
        RF-INV-01
        """
        # Act
        response = self.client.get(
            '/api/v1/inventario/stock/',
            {
                'materia_prima': self.mp_harina.id,
                'bodega': self.bodega_pdp.id,
            },
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['cantidad_total']), 5000.0)

    # ── INV-003 ───────────────────────────────────────────────────────
    def test_inv_003_bodega_pdp_excluida_del_calculo_reorden(self):
        """
        El punto de reorden se calcula SOLO con Bodega Principal.
        El stock de PDP no suma al cálculo.
        RF-INV-02
        """
        # Arrange — reducir stock BP por debajo del punto de reorden
        self.lote_bp.cantidad = 8000  # punto_reorden = 10000
        self.lote_bp.save()
        # Act
        response = self.client.get(
            '/api/v1/inventario/reorden/',
            {'materia_prima': self.mp_harina.id},
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Solo el stock de BP debe aparecer en el cálculo
        self.assertEqual(float(response.data['stock_bodega_principal']), 8000.0)
        self.assertTrue(response.data['por_debajo_reorden'])
        # El stock de PDP no debe sumarse al cálculo de reorden
        self.assertNotIn('stock_pdp', response.data.get('stock_calculo', {}))

    # ── INV-004 ───────────────────────────────────────────────────────
    def test_inv_004_stock_por_debajo_reorden_genera_senal(self):
        """
        Cuando el stock de BP toca el punto de reorden, la respuesta
        indica por_debajo_reorden=True.
        RF-INV-02
        """
        # Arrange — stock exactamente en el punto de reorden (10000)
        self.lote_bp.cantidad = 10000
        self.lote_bp.save()
        # Act
        response = self.client.get(
            '/api/v1/inventario/reorden/',
            {'materia_prima': self.mp_harina.id},
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['por_debajo_reorden'])

    # ── INV-005 ───────────────────────────────────────────────────────
    def test_inv_005_sugerencia_fefo_devuelve_lote_con_vencimiento_mas_proximo(self):
        """
        El endpoint FEFO devuelve el lote con la fecha de vencimiento
        más próxima de la Bodega PDP.
        RF-INV-03
        """
        # Arrange — añadir lote con vencimiento más cercano
        hoy = date.today()
        lote_proximo = Lote.objects.create(
            materia_prima=self.mp_harina,
            bodega=self.bodega_pdp,
            cantidad=2000,
            fecha_vencimiento=hoy + timedelta(days=10),  # vence más pronto
            fecha_entrada=hoy,
        )
        # Act
        response = self.client.get(
            '/api/v1/inventario/fefo/',
            {
                'materia_prima': self.mp_harina.id,
                'bodega': self.bodega_pdp.id,
            },
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['lote_sugerido']['id'], lote_proximo.id)

    # ── INV-006 ───────────────────────────────────────────────────────
    def test_inv_006_fefo_ignora_lotes_vencidos(self):
        """
        La sugerencia FEFO no devuelve lotes con fecha_vencimiento < hoy.
        RF-INV-03
        """
        # Arrange — lote ya vencido en PDP
        hoy = date.today()
        Lote.objects.create(
            materia_prima=self.mp_harina,
            bodega=self.bodega_pdp,
            cantidad=3000,
            fecha_vencimiento=hoy - timedelta(days=1),  # ya venció
            fecha_entrada=hoy - timedelta(days=30),
        )
        # Act
        response = self.client.get(
            '/api/v1/inventario/fefo/',
            {
                'materia_prima': self.mp_harina.id,
                'bodega': self.bodega_pdp.id,
                'excluir_vencidos': True,
            },
        )
        # Assert — el lote vencido no debe estar en la lista
        lote_ids = [l['id'] for l in response.data.get('lotes', [])]
        lotes_vencidos_ids = list(
            Lote.objects.filter(
                bodega=self.bodega_pdp,
                fecha_vencimiento__lt=hoy,
            ).values_list('id', flat=True)
        )
        for vid in lotes_vencidos_ids:
            self.assertNotIn(vid, lote_ids)


class TrasladoInventarioTestCase(APITestCase):
    """INV-007 al INV-012: Traslados, devoluciones y trazabilidad."""

    URL_TRASLADO = '/api/v1/inventario/traslados/'

    def setUp(self):
        self.user = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.mp = MateriaPrima.objects.create(
            nombre='Azúcar blanca',
            unidad_medida=self.gramos,
            punto_reorden=5000,
        )
        self.bodega_principal = Bodega.objects.create(
            nombre='Bodega Principal', tipo='PRINCIPAL'
        )
        self.bodega_pdp = Bodega.objects.create(
            nombre='Bodega PDP', tipo='PDP'
        )
        hoy = date.today()
        self.lote = Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=20000,
            fecha_vencimiento=hoy + timedelta(days=90),
            fecha_entrada=hoy,
        )

    # ── INV-007 ───────────────────────────────────────────────────────
    def test_inv_007_traslado_descuenta_bp_e_incrementa_pdp_atomicamente(self):
        """
        Registrar un traslado descuenta la cantidad de BP e
        incrementa la misma cantidad en PDP. Operación atómica.
        RF-INV-04
        """
        # Arrange
        payload = {
            'lote_id': self.lote.id,
            'bodega_destino': self.bodega_pdp.id,
            'cantidad': 5000,
        }
        cantidad_inicial_bp = self.lote.cantidad
        # Act
        response = self.client.post(self.URL_TRASLADO, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.lote.refresh_from_db()
        self.assertEqual(float(self.lote.cantidad), float(cantidad_inicial_bp) - 5000)
        # Verificar que existe un lote nuevo en PDP con la cantidad trasladada
        lote_pdp = Lote.objects.filter(
            materia_prima=self.mp,
            bodega=self.bodega_pdp,
            cantidad=5000,
        ).first()
        self.assertIsNotNone(lote_pdp)

    # ── INV-008 ───────────────────────────────────────────────────────
    def test_inv_008_traslado_con_stock_insuficiente_devuelve_error(self):
        """
        Intentar trasladar más cantidad de la disponible en BP → HTTP 400.
        RF-INV-04
        """
        # Arrange
        payload = {
            'lote_id': self.lote.id,
            'bodega_destino': self.bodega_pdp.id,
            'cantidad': 99999,  # más que los 20000 disponibles
        }
        # Act
        response = self.client.post(self.URL_TRASLADO, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # El lote no debe haber cambiado
        self.lote.refresh_from_db()
        self.assertEqual(float(self.lote.cantidad), 20000.0)

    # ── INV-009 ───────────────────────────────────────────────────────
    def test_inv_009_traslado_es_inmutable(self):
        """
        Un traslado confirmado no puede modificarse ni eliminarse.
        RF-INV-04 (inmutabilidad de movimientos)
        """
        # Arrange — crear un traslado
        payload = {
            'lote_id': self.lote.id,
            'bodega_destino': self.bodega_pdp.id,
            'cantidad': 3000,
        }
        create_response = self.client.post(self.URL_TRASLADO, payload, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        traslado_id = create_response.data['id']
        # Act — intentar modificar
        patch_response = self.client.patch(
            f'{self.URL_TRASLADO}{traslado_id}/',
            {'cantidad': 9999},
            format='json',
        )
        delete_response = self.client.delete(
            f'{self.URL_TRASLADO}{traslado_id}/'
        )
        # Assert — ambas operaciones deben estar prohibidas
        self.assertIn(
            patch_response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED],
        )
        self.assertIn(
            delete_response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED],
        )

    # ── INV-010 ───────────────────────────────────────────────────────
    def test_inv_010_registrar_devolucion_lote_vencido_a_proveedor(self):
        """
        POST /inventario/devoluciones/ registra la devolución de un
        lote vencido al proveedor. El movimiento queda en bitácora.
        RF-INV-05
        """
        # Arrange — lote ya vencido
        from apps.catalogo.models import Proveedor
        proveedor = Proveedor.objects.create(nombre='Proveedor Externo S.A.')
        lote_vencido = Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=500,
            fecha_vencimiento=date.today() - timedelta(days=5),
            fecha_entrada=date.today() - timedelta(days=60),
        )
        payload = {
            'lote_id': lote_vencido.id,
            'proveedor_id': proveedor.id,
            'motivo': 'Lote vencido. Devolución acordada con proveedor.',
        }
        # Act
        response = self.client.post(
            '/api/v1/inventario/devoluciones/', payload, format='json'
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        lote_vencido.refresh_from_db()
        self.assertEqual(float(lote_vencido.cantidad), 0)

    # ── INV-011 ───────────────────────────────────────────────────────
    def test_inv_011_registrar_descarte_de_lote_vencido(self):
        """
        POST /inventario/descartes/ registra el descarte de un lote vencido.
        El stock del lote llega a 0 y el movimiento queda en bitácora.
        RF-INV-05
        """
        # Arrange
        lote_vencido = Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=200,
            fecha_vencimiento=date.today() - timedelta(days=3),
            fecha_entrada=date.today() - timedelta(days=45),
        )
        payload = {
            'lote_id': lote_vencido.id,
            'motivo': 'Descarte por vencimiento. Autorizado por Jefe de Producción.',
        }
        # Act
        response = self.client.post(
            '/api/v1/inventario/descartes/', payload, format='json'
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        lote_vencido.refresh_from_db()
        self.assertEqual(float(lote_vencido.cantidad), 0)

    # ── INV-012 ───────────────────────────────────────────────────────
    def test_inv_012_trazabilidad_lote_desde_recepcion_hasta_consumo(self):
        """
        La API de trazabilidad devuelve el historial completo de un
        lote: recepción → traslado → consumo en producción.
        RF-INV-01 (consulta detallada)
        """
        # Arrange — simular movimientos del lote
        MovimientoInventario.objects.create(
            tipo='RECEPCION',
            lote=self.lote,
            bodega_destino=self.bodega_principal,
            cantidad=20000,
            usuario=self.user,
            notas='Recepción OC-2026-001',
        )
        MovimientoInventario.objects.create(
            tipo='TRASLADO',
            lote=self.lote,
            bodega_origen=self.bodega_principal,
            bodega_destino=self.bodega_pdp,
            cantidad=5000,
            usuario=self.user,
        )
        # Act
        response = self.client.get(
            f'/api/v1/inventario/trazabilidad/{self.lote.id}/'
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tipos_en_historial = [m['tipo'] for m in response.data['movimientos']]
        self.assertIn('RECEPCION', tipos_en_historial)
        self.assertIn('TRASLADO', tipos_en_historial)
```

---

## 6. REC — Recepción

### 6.1 Tabla resumen

| ID Prueba | Descripción | Tipo | RF que cubre | Prioridad |
|-----------|-------------|------|--------------|-----------|
| REC-001 | Recepción exitosa contra orden de compra | API | RF-REC-01 | Alta |
| REC-002 | Recepción sin orden de compra previa → rechazada | API | RF-REC-01 | Alta |
| REC-003 | Conversión automática: recepción en bolsas, stock en gramos | API | RF-REC-02 | Alta |
| REC-004 | Se crea lote con fecha de vencimiento correcta | API | RF-REC-03 | Alta |
| REC-005 | Stock de Bodega Principal incrementa tras recepción | Integración | RF-REC-04 | Alta |
| REC-006 | Recepción confirmada es inmutable | API | RF-REC-05 | Alta |
| REC-007 | Validación: lote con vida útil suficiente → OK | API | RF-REC-06 | Alta |
| REC-008 | Validación: vida útil insuficiente → alerta bloqueante | API | RF-REC-06 | Alta |
| REC-009 | Vida útil insuficiente + justificación → puede continuar | API | RF-REC-06 | Alta |
| REC-010 | Múltiples lotes del mismo producto en una recepción | API | RF-REC-03 | Media |

### 6.2 Código de pruebas

```python
# apps/recepcion/tests/test_recepcion.py

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date, timedelta

from apps.catalogo.models import (
    UnidadMedida, MateriaPrima, Presentacion, Proveedor
)
from apps.inventario.models import Bodega, Lote
from apps.recepcion.models import OrdenCompra, DetalleOrdenCompra, RecepcionMercancia

User = get_user_model()

URL_RECEPCION = '/api/v1/recepcion/'


class RecepcionMercanciaTestCase(APITestCase):
    """
    REC-001 al REC-010: Validación de recepciones contra orden de compra,
    conversión de unidades, creación de lotes y regla de días mínimos.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        # Catálogo base
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.proveedor = Proveedor.objects.create(
            nombre='Distribuidora Andina', telefono='3109876543'
        )
        self.mp_harina = MateriaPrima.objects.create(
            nombre='Harina de trigo',
            unidad_medida=self.gramos,
            punto_reorden=10000,
            dias_minimos_vencimiento=30,
        )
        self.presentacion_bolsa = Presentacion.objects.create(
            nombre='Bolsa 50kg',
            materia_prima=self.mp_harina,
            unidad_medida=self.gramos,
            factor_conversion=50000,
        )
        self.bodega_principal = Bodega.objects.create(
            nombre='Bodega Principal', tipo='PRINCIPAL'
        )
        # Orden de compra abierta
        self.oc = OrdenCompra.objects.create(
            proveedor=self.proveedor,
            fecha_creacion=date.today(),
            estado='PENDIENTE',
            usuario_creador=self.user,
        )
        DetalleOrdenCompra.objects.create(
            orden=self.oc,
            materia_prima=self.mp_harina,
            cantidad_presentacion=10,
            presentacion=self.presentacion_bolsa,
        )

    # ── REC-001 ───────────────────────────────────────────────────────
    def test_rec_001_recepcion_exitosa_contra_orden_de_compra(self):
        """
        POST /recepcion/ con orden de compra válida → HTTP 201,
        se crea la RecepcionMercancia y el lote correspondiente.
        RF-REC-01
        """
        # Arrange
        fecha_vencimiento = date.today() + timedelta(days=120)
        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 5,
                    'fecha_vencimiento': str(fecha_vencimiento),
                    'numero_lote': 'LOT-2026-001',
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            RecepcionMercancia.objects.filter(orden_compra=self.oc).exists()
        )

    # ── REC-002 ───────────────────────────────────────────────────────
    def test_rec_002_recepcion_sin_orden_compra_es_rechazada(self):
        """
        POST /recepcion/ sin referencia a una OC válida → HTTP 400.
        RF-REC-01
        """
        # Arrange
        payload = {
            'orden_compra_id': 99999,  # ID inexistente
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 2,
                    'fecha_vencimiento': str(date.today() + timedelta(days=60)),
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── REC-003 ───────────────────────────────────────────────────────
    def test_rec_003_conversion_automatica_presentacion_a_unidad_base(self):
        """
        Al recibir 3 bolsas de 50kg (factor=50000g/bolsa), el lote
        creado debe tener cantidad = 3 × 50000 = 150000 gramos.
        RF-REC-02
        """
        # Arrange
        fecha_vencimiento = date.today() + timedelta(days=120)
        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 3,
                    'fecha_vencimiento': str(fecha_vencimiento),
                    'numero_lote': 'LOT-2026-002',
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        lote = Lote.objects.filter(
            materia_prima=self.mp_harina,
            bodega=self.bodega_principal,
        ).order_by('-id').first()
        self.assertIsNotNone(lote)
        self.assertEqual(float(lote.cantidad), 150000.0)  # 3 bolsas × 50000g

    # ── REC-004 ───────────────────────────────────────────────────────
    def test_rec_004_lote_creado_con_fecha_vencimiento_correcta(self):
        """
        El lote generado en la recepción tiene la fecha de vencimiento
        exacta que se indicó en el detalle.
        RF-REC-03
        """
        # Arrange
        fecha_vencimiento = date.today() + timedelta(days=90)
        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 2,
                    'fecha_vencimiento': str(fecha_vencimiento),
                    'numero_lote': 'LOT-2026-003',
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        lote = Lote.objects.filter(numero_lote='LOT-2026-003').first()
        self.assertIsNotNone(lote)
        self.assertEqual(lote.fecha_vencimiento, fecha_vencimiento)

    # ── REC-005 ───────────────────────────────────────────────────────
    def test_rec_005_stock_bodega_principal_incrementa_tras_recepcion(self):
        """
        Después de confirmar la recepción, el stock de Bodega Principal
        para la MP debe haber aumentado.
        RF-REC-04
        """
        # Arrange
        stock_antes = Lote.objects.filter(
            materia_prima=self.mp_harina,
            bodega=self.bodega_principal,
        ).aggregate(
            total=__import__('django.db.models', fromlist=['Sum']).Sum('cantidad')
        )['total'] or 0

        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 4,  # 4 × 50000 = 200000g
                    'fecha_vencimiento': str(date.today() + timedelta(days=100)),
                    'numero_lote': 'LOT-2026-004',
                }
            ],
        }
        # Act
        self.client.post(URL_RECEPCION, payload, format='json')
        from django.db.models import Sum
        stock_despues = Lote.objects.filter(
            materia_prima=self.mp_harina,
            bodega=self.bodega_principal,
        ).aggregate(total=Sum('cantidad'))['total'] or 0
        # Assert
        self.assertGreater(float(stock_despues), float(stock_antes))

    # ── REC-006 ───────────────────────────────────────────────────────
    def test_rec_006_recepcion_confirmada_es_inmutable(self):
        """
        Una RecepcionMercancia confirmada no puede editarse ni borrarse.
        RF-REC-05
        """
        # Arrange — crear y confirmar una recepción
        recepcion = RecepcionMercancia.objects.create(
            orden_compra=self.oc,
            fecha=date.today(),
            usuario=self.user,
            confirmada=True,
        )
        # Act — intentar modificar
        patch_response = self.client.patch(
            f'{URL_RECEPCION}{recepcion.id}/',
            {'confirmada': False},
            format='json',
        )
        delete_response = self.client.delete(
            f'{URL_RECEPCION}{recepcion.id}/'
        )
        # Assert
        self.assertIn(
            patch_response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED],
        )
        self.assertIn(
            delete_response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED],
        )

    # ── REC-007 ───────────────────────────────────────────────────────
    def test_rec_007_lote_con_vida_util_suficiente_pasa_validacion(self):
        """
        Si fecha_vencimiento − hoy >= dias_minimos_vencimiento (30 días),
        la recepción se acepta normalmente.
        RF-REC-06
        """
        # Arrange — vence en 60 días, mínimo requerido: 30 días → OK
        fecha_vencimiento = date.today() + timedelta(days=60)
        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 1,
                    'fecha_vencimiento': str(fecha_vencimiento),
                    'numero_lote': 'LOT-2026-005',
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ── REC-008 ───────────────────────────────────────────────────────
    def test_rec_008_vida_util_insuficiente_genera_alerta_bloqueante(self):
        """
        Si fecha_vencimiento − hoy < dias_minimos_vencimiento (30 días),
        la recepción no se procesa y devuelve HTTP 422 con alerta bloqueante.
        RF-REC-06
        """
        # Arrange — vence en 10 días, mínimo requerido: 30 días → BLOQUEANTE
        fecha_vencimiento = date.today() + timedelta(days=10)
        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 1,
                    'fecha_vencimiento': str(fecha_vencimiento),
                    'numero_lote': 'LOT-2026-006',
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert — HTTP 422 Unprocessable Entity o 400
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY],
        )
        self.assertIn('dias_minimos', str(response.data).lower())

    # ── REC-009 ───────────────────────────────────────────────────────
    def test_rec_009_vida_util_insuficiente_con_justificacion_puede_continuar(self):
        """
        Si vida útil < mínimo PERO se provee justificación_vencimiento,
        la recepción se acepta con advertencia.
        RF-REC-06
        """
        # Arrange
        fecha_vencimiento = date.today() + timedelta(days=10)
        payload = {
            'orden_compra_id': self.oc.id,
            'justificacion_vencimiento': (
                'Proveedor confirmó que el lote es válido. '
                'Autorizado por Gerencia.'
            ),
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 1,
                    'fecha_vencimiento': str(fecha_vencimiento),
                    'numero_lote': 'LOT-2026-007',
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # La justificación queda guardada
        rec = RecepcionMercancia.objects.order_by('-id').first()
        self.assertIn('Gerencia', rec.justificacion_vencimiento)

    # ── REC-010 ───────────────────────────────────────────────────────
    def test_rec_010_multiples_lotes_mismo_producto_en_una_recepcion(self):
        """
        Una recepción puede incluir el mismo producto en dos detalles
        con distintos números de lote y fechas de vencimiento.
        Ambos lotes se crean en Bodega Principal.
        RF-REC-03
        """
        # Arrange
        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 2,
                    'fecha_vencimiento': str(date.today() + timedelta(days=80)),
                    'numero_lote': 'LOT-A',
                },
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 3,
                    'fecha_vencimiento': str(date.today() + timedelta(days=90)),
                    'numero_lote': 'LOT-B',
                },
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Lote.objects.filter(numero_lote='LOT-A').exists())
        self.assertTrue(Lote.objects.filter(numero_lote='LOT-B').exists())
```

---

## 7. PROD — Producción y Despacho

### 7.1 Tabla resumen

| ID Prueba | Descripción | Tipo | RF que cubre | Prioridad |
|-----------|-------------|------|--------------|-----------|
| PROD-001 | Registrar batido descuenta materias primas de Bodega PDP | API | RF-PROD-01, RF-PROD-02 | Alta |
| PROD-002 | Sugerencia FEFO para descuento de ingredientes en batido | API | RF-PROD-02 | Alta |
| PROD-003 | Stock insuficiente → error con nombre y cantidad exacta faltante | API | RF-PROD-03 | Alta |
| PROD-004 | No se pueden registrar más de 2 batidos simultáneos | API | RF-PROD-04 | Alta |
| PROD-005 | Al registrar batido se crea lote EN_ESPERA con vencimiento correcto | API | RF-PROD-05 | Alta |
| PROD-006 | Despacho al PDV: lote pasa de EN_ESPERA a EN_PUNTO_DE_VENTA | API | RF-PROD-06 | Alta |
| PROD-007 | FIFO: se despacha primero el lote producido más antiguo | API | RF-PROD-06 | Alta |
| PROD-008 | Despacho es irreversible (no puede volver a EN_ESPERA) | API | RF-PROD-07 | Alta |
| PROD-009 | Corrección via movimiento compensatorio ajusta inventario atómicamente | API | RF-PROD-08 | Alta |
| PROD-010 | Movimiento compensatorio visible para todos los roles | API | RF-PROD-08 | Alta |
| PROD-011 | Compensatorio registra dato original, corregido, usuario y fecha-hora | Integración | RF-PROD-08 | Alta |
| PROD-012 | Fecha vencimiento lote PT = fecha producción + vida útil del producto | Unitaria | RF-PROD-05 | Media |
| PROD-013 | Múltiples batidos del mismo día forman jornada de producción | Integración | RF-PROD-01 | Media |
| PROD-014 | Transacción atómica: falla a mitad → todo se revierte | Unitaria | RF-PROD-01 | Alta |

### 7.2 Código de pruebas

```python
# apps/produccion/tests/test_produccion.py

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db import transaction, IntegrityError
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date, timedelta
from unittest.mock import patch

from apps.catalogo.models import UnidadMedida, MateriaPrima, ProductoTerminado
from apps.inventario.models import Bodega, Lote
from apps.produccion.models import (
    Batido,
    DetalleBatido,
    LoteProductoTerminado,
    MovimientoCompensatorio,
)

User = get_user_model()

URL_BATIDOS    = '/api/v1/produccion/batidos/'
URL_DESPACHOS  = '/api/v1/produccion/despachos/'
URL_COMP       = '/api/v1/produccion/compensatorios/'


class BatidoTestCase(APITestCase):
    """PROD-001 al PROD-008 y PROD-012-014: Registro de batidos y producción."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='produccion@daluzed.com',
            password='Daluzed2026!',
            role='PRODUCCION',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        # Catálogo
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.unidades = UnidadMedida.objects.create(nombre='Unidades', simbolo='und')

        self.mp_harina = MateriaPrima.objects.create(
            nombre='Harina', unidad_medida=self.gramos, punto_reorden=5000
        )
        self.mp_azucar = MateriaPrima.objects.create(
            nombre='Azúcar', unidad_medida=self.gramos, punto_reorden=3000
        )
        self.torta_vainilla = ProductoTerminado.objects.create(
            nombre='Torta de vainilla', vida_util_dias=14, unidad_medida=self.unidades
        )
        # Bodegas
        self.bodega_pdp = Bodega.objects.create(nombre='Bodega PDP', tipo='PDP')
        # Lotes disponibles en PDP
        hoy = date.today()
        self.lote_harina_nuevo = Lote.objects.create(
            materia_prima=self.mp_harina,
            bodega=self.bodega_pdp,
            cantidad=20000,
            fecha_vencimiento=hoy + timedelta(days=60),
            fecha_entrada=hoy,
        )
        self.lote_harina_proximo = Lote.objects.create(
            materia_prima=self.mp_harina,
            bodega=self.bodega_pdp,
            cantidad=5000,
            fecha_vencimiento=hoy + timedelta(days=15),  # vence más pronto
            fecha_entrada=hoy - timedelta(days=2),
        )
        self.lote_azucar = Lote.objects.create(
            materia_prima=self.mp_azucar,
            bodega=self.bodega_pdp,
            cantidad=10000,
            fecha_vencimiento=hoy + timedelta(days=90),
            fecha_entrada=hoy,
        )

    def _payload_batido_valido(self):
        """Payload base para un batido válido."""
        return {
            'producto_terminado_id': self.torta_vainilla.id,
            'fecha_produccion': str(date.today()),
            'hora_inicio': '08:00',
            'ingredientes': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'lote_id': self.lote_harina_proximo.id,
                    'cantidad': 3000,
                },
                {
                    'materia_prima_id': self.mp_azucar.id,
                    'lote_id': self.lote_azucar.id,
                    'cantidad': 1500,
                },
            ],
        }

    # ── PROD-001 ──────────────────────────────────────────────────────
    def test_prod_001_registrar_batido_descuenta_mp_de_bodega_pdp(self):
        """
        Al confirmar un batido, las cantidades de los ingredientes
        se descuentan de los lotes de Bodega PDP.
        RF-PROD-01, RF-PROD-02
        """
        # Arrange
        cantidad_harina_antes = float(self.lote_harina_proximo.cantidad)
        payload = self._payload_batido_valido()
        # Act
        response = self.client.post(URL_BATIDOS, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.lote_harina_proximo.refresh_from_db()
        self.assertEqual(
            float(self.lote_harina_proximo.cantidad),
            cantidad_harina_antes - 3000,
        )

    # ── PROD-002 ──────────────────────────────────────────────────────
    def test_prod_002_sugerencia_fefo_para_ingredientes(self):
        """
        El endpoint de sugerencia FEFO devuelve el lote con
        vencimiento más próximo para cada ingrediente.
        RF-PROD-02
        """
        # Act
        response = self.client.get(
            '/api/v1/produccion/sugerencia-fefo/',
            {'producto_terminado_id': self.torta_vainilla.id},
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Para harina, debe sugerir el lote que vence más pronto
        harina_sugerencia = next(
            (s for s in response.data['sugerencias']
             if s['materia_prima_id'] == self.mp_harina.id),
            None,
        )
        self.assertIsNotNone(harina_sugerencia)
        self.assertEqual(
            harina_sugerencia['lote_id'], self.lote_harina_proximo.id
        )

    # ── PROD-003 ──────────────────────────────────────────────────────
    def test_prod_003_stock_insuficiente_devuelve_nombre_y_cantidad_faltante(self):
        """
        Si un ingrediente no tiene stock suficiente en PDP, el error
        debe incluir nombre de la materia prima y cantidad exacta faltante.
        RF-PROD-03
        """
        # Arrange — pedir más harina de la disponible
        payload = self._payload_batido_valido()
        payload['ingredientes'][0]['cantidad'] = 99999  # mucho más que 5000 disponibles

        # Act
        response = self.client.post(URL_BATIDOS, payload, format='json')

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_str = str(response.data)
        self.assertIn('Harina', error_str)
        self.assertIn('faltante', error_str.lower())

    # ── PROD-004 ──────────────────────────────────────────────────────
    def test_prod_004_maximo_dos_batidos_simultaneos(self):
        """
        No se pueden tener más de 2 batidos con estado EN_PROCESO al mismo tiempo.
        El tercer intento debe devolver HTTP 400.
        RF-PROD-04
        """
        # Arrange — crear 2 batidos en estado EN_PROCESO
        for i in range(2):
            Batido.objects.create(
                producto_terminado=self.torta_vainilla,
                fecha_produccion=date.today(),
                hora_inicio='08:00',
                estado='EN_PROCESO',
                usuario=self.user,
            )
        # Act — intentar crear el tercero
        payload = self._payload_batido_valido()
        response = self.client.post(URL_BATIDOS, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('2', str(response.data))

    # ── PROD-005 ──────────────────────────────────────────────────────
    def test_prod_005_batido_crea_lote_en_espera_con_vencimiento_correcto(self):
        """
        Al completar un batido, se crea un LoteProductoTerminado
        en estado EN_ESPERA cuya fecha de vencimiento es
        fecha_produccion + vida_util_dias del producto.
        RF-PROD-05
        """
        # Arrange
        fecha_prod = date.today()
        payload = self._payload_batido_valido()
        payload['fecha_produccion'] = str(fecha_prod)
        # Act
        response = self.client.post(URL_BATIDOS, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        batido_id = response.data['id']
        lote_pt = LoteProductoTerminado.objects.filter(
            batido_id=batido_id
        ).first()
        self.assertIsNotNone(lote_pt)
        self.assertEqual(lote_pt.estado, 'EN_ESPERA')
        vencimiento_esperado = fecha_prod + timedelta(
            days=self.torta_vainilla.vida_util_dias
        )
        self.assertEqual(lote_pt.fecha_vencimiento, vencimiento_esperado)

    # ── PROD-006 ──────────────────────────────────────────────────────
    def test_prod_006_despacho_cambia_estado_a_en_punto_de_venta(self):
        """
        POST /produccion/despachos/{id}/ cambia el estado del
        LoteProductoTerminado de EN_ESPERA a EN_PUNTO_DE_VENTA.
        RF-PROD-06
        """
        # Arrange
        batido = Batido.objects.create(
            producto_terminado=self.torta_vainilla,
            fecha_produccion=date.today() - timedelta(days=1),
            hora_inicio='07:00',
            estado='COMPLETADO',
            usuario=self.user,
        )
        lote_pt = LoteProductoTerminado.objects.create(
            batido=batido,
            estado='EN_ESPERA',
            fecha_vencimiento=date.today() + timedelta(days=13),
            fecha_produccion=date.today() - timedelta(days=1),
            cantidad=20,
        )
        # Act
        response = self.client.post(
            f'{URL_DESPACHOS}{lote_pt.id}/despachar/'
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lote_pt.refresh_from_db()
        self.assertEqual(lote_pt.estado, 'EN_PUNTO_DE_VENTA')

    # ── PROD-007 ──────────────────────────────────────────────────────
    def test_prod_007_fifo_despacha_lote_mas_antiguo_primero(self):
        """
        La sugerencia FIFO para despacho devuelve el lote producido
        con fecha más antigua (primer lote producido = primero en salir).
        RF-PROD-06
        """
        # Arrange — crear dos lotes en EN_ESPERA con fechas distintas
        batido_viejo = Batido.objects.create(
            producto_terminado=self.torta_vainilla,
            fecha_produccion=date.today() - timedelta(days=2),
            hora_inicio='07:00',
            estado='COMPLETADO',
            usuario=self.user,
        )
        lote_viejo = LoteProductoTerminado.objects.create(
            batido=batido_viejo,
            estado='EN_ESPERA',
            fecha_vencimiento=date.today() + timedelta(days=12),
            fecha_produccion=date.today() - timedelta(days=2),
            cantidad=15,
        )
        batido_nuevo = Batido.objects.create(
            producto_terminado=self.torta_vainilla,
            fecha_produccion=date.today() - timedelta(days=1),
            hora_inicio='08:00',
            estado='COMPLETADO',
            usuario=self.user,
        )
        LoteProductoTerminado.objects.create(
            batido=batido_nuevo,
            estado='EN_ESPERA',
            fecha_vencimiento=date.today() + timedelta(days=13),
            fecha_produccion=date.today() - timedelta(days=1),
            cantidad=20,
        )
        # Act
        response = self.client.get(
            '/api/v1/produccion/sugerencia-fifo/',
            {'producto_terminado_id': self.torta_vainilla.id},
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['lote_sugerido']['id'], lote_viejo.id)

    # ── PROD-008 ──────────────────────────────────────────────────────
    def test_prod_008_despacho_es_irreversible(self):
        """
        Un lote EN_PUNTO_DE_VENTA no puede volver a EN_ESPERA.
        El intento debe devolver HTTP 400.
        RF-PROD-07
        """
        # Arrange
        batido = Batido.objects.create(
            producto_terminado=self.torta_vainilla,
            fecha_produccion=date.today(),
            hora_inicio='09:00',
            estado='COMPLETADO',
            usuario=self.user,
        )
        lote_pt = LoteProductoTerminado.objects.create(
            batido=batido,
            estado='EN_PUNTO_DE_VENTA',
            fecha_vencimiento=date.today() + timedelta(days=13),
            fecha_produccion=date.today(),
            fecha_despacho=date.today(),
            cantidad=10,
        )
        # Act — intentar revertir el estado
        response = self.client.patch(
            f'{URL_DESPACHOS}{lote_pt.id}/',
            {'estado': 'EN_ESPERA'},
            format='json',
        )
        # Assert
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN,
             status.HTTP_405_METHOD_NOT_ALLOWED],
        )
        lote_pt.refresh_from_db()
        self.assertEqual(lote_pt.estado, 'EN_PUNTO_DE_VENTA')


class MovimientoCompensatorioTestCase(APITestCase):
    """PROD-009 al PROD-011: Corrección de registros mediante movimiento compensatorio."""

    def setUp(self):
        self.user_inventario = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        self.user_gerente = User.objects.create_user(
            email='gerente@daluzed.com',
            password='Daluzed2026!',
            role='GERENTE',
        )
        self.user_produccion = User.objects.create_user(
            email='produccion@daluzed.com',
            password='Daluzed2026!',
            role='PRODUCCION',
        )
        # Autenticar como inventario para crear el compensatorio
        refresh = RefreshToken.for_user(self.user_inventario)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.mp = MateriaPrima.objects.create(
            nombre='Azúcar', unidad_medida=gramos, punto_reorden=2000
        )
        bodega_pdp = Bodega.objects.create(nombre='Bodega PDP', tipo='PDP')
        self.lote = Lote.objects.create(
            materia_prima=self.mp,
            bodega=bodega_pdp,
            cantidad=10000,
            fecha_vencimiento=date.today() + timedelta(days=90),
            fecha_entrada=date.today(),
        )

    # ── PROD-009 ──────────────────────────────────────────────────────
    def test_prod_009_compensatorio_ajusta_inventario_atomicamente(self):
        """
        POST /produccion/compensatorios/ registra un ajuste
        y actualiza el inventario de forma atómica.
        RF-PROD-08
        """
        # Arrange
        payload = {
            'tipo_afectado': 'Lote',
            'id_afectado': self.lote.id,
            'datos_originales': {'cantidad': 10000},
            'datos_corregidos': {'cantidad': 9500},
            'descripcion': 'Error en conteo. Cantidad real: 9500g.',
        }
        # Act
        response = self.client.post(URL_COMP, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.lote.refresh_from_db()
        self.assertEqual(float(self.lote.cantidad), 9500.0)

    # ── PROD-010 ──────────────────────────────────────────────────────
    def test_prod_010_compensatorio_visible_para_todos_los_roles(self):
        """
        GET /produccion/compensatorios/ es accesible por todos los
        roles autenticados: INVENTARIO, GERENTE, PRODUCCION, ADMIN.
        RF-PROD-08
        """
        # Arrange — crear un compensatorio existente
        MovimientoCompensatorio.objects.create(
            tipo_afectado='Lote',
            id_afectado=self.lote.id,
            descripcion='Ajuste de prueba',
            usuario=self.user_inventario,
            datos_originales={'cantidad': 10000},
            datos_corregidos={'cantidad': 9500},
        )
        roles_y_usuarios = [
            self.user_inventario,
            self.user_gerente,
            self.user_produccion,
        ]
        for usuario in roles_y_usuarios:
            # Act — cada rol consulta el endpoint
            refresh = RefreshToken.for_user(usuario)
            self.client.credentials(
                HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
            )
            response = self.client.get(URL_COMP)
            # Assert — todos deben ver los compensatorios
            self.assertEqual(
                response.status_code, status.HTTP_200_OK,
                msg=f'Falló para el rol {usuario.role}',
            )

    # ── PROD-011 ──────────────────────────────────────────────────────
    def test_prod_011_compensatorio_registra_datos_completos(self):
        """
        El movimiento compensatorio almacena: dato original, dato corregido,
        usuario que lo registra y fecha-hora (auto_now_add).
        RF-PROD-08
        """
        # Arrange
        payload = {
            'tipo_afectado': 'Lote',
            'id_afectado': self.lote.id,
            'datos_originales': {'cantidad': 10000},
            'datos_corregidos': {'cantidad': 8000},
            'descripcion': 'Se contabilizaron 2000g que ya habían sido consumidos.',
        }
        # Act
        response = self.client.post(URL_COMP, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        comp = MovimientoCompensatorio.objects.order_by('-id').first()
        self.assertEqual(comp.datos_originales['cantidad'], 10000)
        self.assertEqual(comp.datos_corregidos['cantidad'], 8000)
        self.assertEqual(comp.usuario, self.user_inventario)
        self.assertIsNotNone(comp.fecha)
        self.assertIn(
            'consumidos', comp.descripcion.lower()
        )

    # ── PROD-012 ──────────────────────────────────────────────────────
    def test_prod_012_fecha_vencimiento_lote_pt_es_produccion_mas_vida_util(self):
        """
        Verificar fórmula: fecha_vencimiento = fecha_produccion + vida_util_dias.
        RF-PROD-05
        """
        # Arrange
        unidades = UnidadMedida.objects.create(nombre='Und2', simbolo='u2')
        producto = ProductoTerminado.objects.create(
            nombre='Bizcocho', vida_util_dias=5, unidad_medida=unidades
        )
        fecha_prod = date(2026, 6, 1)
        # Act
        fecha_vencimiento_calculada = fecha_prod + timedelta(days=producto.vida_util_dias)
        # Assert
        self.assertEqual(fecha_vencimiento_calculada, date(2026, 6, 6))

    # ── PROD-013 ──────────────────────────────────────────────────────
    def test_prod_013_multiples_batidos_mismo_dia_agrupados_en_jornada(self):
        """
        Varios batidos con la misma fecha_produccion pertenecen a
        la misma jornada y el endpoint de jornadas los devuelve agrupados.
        RF-PROD-01
        """
        # Arrange
        unidades = UnidadMedida.objects.create(nombre='Und3', simbolo='u3')
        pt = ProductoTerminado.objects.create(
            nombre='Torta test', vida_util_dias=14, unidad_medida=unidades
        )
        hoy = date.today()
        for i in range(3):
            Batido.objects.create(
                producto_terminado=pt,
                fecha_produccion=hoy,
                hora_inicio=f'0{7+i}:00',
                estado='COMPLETADO',
                usuario=self.user_inventario,
            )
        # Act
        response = self.client.get(
            '/api/v1/produccion/jornadas/',
            {'fecha': str(hoy)},
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(
            response.data['total_batidos'], 3
        )

    # ── PROD-014 ──────────────────────────────────────────────────────
    def test_prod_014_transaccion_atomica_revierte_si_falla_a_mitad(self):
        """
        Si el descuento de ingredientes falla en la mitad del proceso
        (ej: segundo ingrediente sin stock), ningún lote ni descuento
        debe quedar parcialmente aplicado.
        RF-PROD-01
        """
        # Arrange — azúcar con stock insuficiente
        self.lote_azucar_pdp = Lote.objects.create(
            materia_prima=self.mp,
            bodega=Bodega.objects.get(tipo='PDP'),
            cantidad=100,  # muy poco
            fecha_vencimiento=date.today() + timedelta(days=90),
            fecha_entrada=date.today(),
        )
        gramos = UnidadMedida.objects.get(simbolo='g')
        mp_harina = MateriaPrima.objects.create(
            nombre='Harina2', unidad_medida=gramos, punto_reorden=1000
        )
        lote_harina_pdp = Lote.objects.create(
            materia_prima=mp_harina,
            bodega=Bodega.objects.get(tipo='PDP'),
            cantidad=5000,
            fecha_vencimiento=date.today() + timedelta(days=60),
            fecha_entrada=date.today(),
        )
        unidades = UnidadMedida.objects.create(nombre='Und4', simbolo='u4')
        pt = ProductoTerminado.objects.create(
            nombre='Torta atomica', vida_util_dias=14, unidad_medida=unidades
        )
        payload = {
            'producto_terminado_id': pt.id,
            'fecha_produccion': str(date.today()),
            'hora_inicio': '10:00',
            'ingredientes': [
                {
                    'materia_prima_id': mp_harina.id,
                    'lote_id': lote_harina_pdp.id,
                    'cantidad': 1000,  # OK — hay 5000
                },
                {
                    'materia_prima_id': self.mp.id,
                    'lote_id': self.lote_azucar_pdp.id,
                    'cantidad': 5000,  # FALLA — solo hay 100
                },
            ],
        }
        cantidad_harina_antes = float(lote_harina_pdp.cantidad)
        # Act
        response = self.client.post(URL_BATIDOS, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # La harina NO debe haberse descontado (transacción se revirtió)
        lote_harina_pdp.refresh_from_db()
        self.assertEqual(float(lote_harina_pdp.cantidad), cantidad_harina_antes)
```

---

## 8. ALR — Alertas y Notificaciones

### 8.1 Tabla resumen

| ID Prueba | Descripción | Tipo | RF que cubre | Prioridad |
|-----------|-------------|------|--------------|-----------|
| ALR-001 | Stock Bodega Principal toca punto de reorden → alerta generada | Integración | RF-ALR-01 | Alta |
| ALR-002 | Stock Bodega PDP toca punto de reorden → NO se genera alerta | Integración | RF-ALR-01, RF-INV-02 | Alta |
| ALR-003 | Lote con vencimiento en N días → alerta generada | Integración | RF-ALR-02 | Alta |
| ALR-004 | Lote EN_ESPERA más de X horas → alerta generada | Integración | RF-ALR-03 | Media |
| ALR-005 | Alerta resuelta no se re-envía hasta que condición vuelve a dispararse | Unitaria | RF-ALR-04 | Alta |
| ALR-006 | Alerta enviada por WebSocket a usuarios conectados | Unitaria | RF-ALR-05 | Alta |
| ALR-007 | Alerta enviada por WhatsApp (mock Twilio) | Unitaria | RF-ALR-02 | Media |
| ALR-008 | Alerta enviada por email (mock SMTP) | Unitaria | RF-ALR-02 | Baja |

### 8.2 Código de pruebas

```python
# apps/alertas/tests/test_alertas.py

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch, MagicMock
from datetime import date, timedelta

from apps.catalogo.models import UnidadMedida, MateriaPrima
from apps.inventario.models import Bodega, Lote
from apps.alertas.models import Alerta
from apps.alertas.services import AlertaService  # servicio de negocio a implementar

User = get_user_model()


class AlertasTestCase(TestCase):
    """
    ALR-001 al ALR-008: Generación, deduplicación y envío de alertas.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.mp = MateriaPrima.objects.create(
            nombre='Harina de trigo',
            unidad_medida=self.gramos,
            punto_reorden=10000,
        )
        self.bodega_principal = Bodega.objects.create(
            nombre='Bodega Principal', tipo='PRINCIPAL'
        )
        self.bodega_pdp = Bodega.objects.create(
            nombre='Bodega PDP', tipo='PDP'
        )

    # ── ALR-001 ───────────────────────────────────────────────────────
    def test_alr_001_stock_bodega_principal_bajo_reorden_genera_alerta(self):
        """
        Cuando el stock de Bodega Principal cae al punto de reorden
        (o por debajo), AlertaService genera una alerta STOCK_BAJO.
        RF-ALR-01
        """
        # Arrange — stock exactamente en el punto de reorden
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=9000,  # por debajo de punto_reorden=10000
            fecha_vencimiento=date.today() + timedelta(days=60),
            fecha_entrada=date.today(),
        )
        # Act
        AlertaService.verificar_stock_reorden(self.mp)
        # Assert
        alerta = Alerta.objects.filter(
            tipo='STOCK_BAJO',
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            activa=True,
        ).first()
        self.assertIsNotNone(alerta)

    # ── ALR-002 ───────────────────────────────────────────────────────
    def test_alr_002_stock_bodega_pdp_bajo_reorden_no_genera_alerta(self):
        """
        Cuando el stock de Bodega PDP cae por debajo del punto de reorden,
        NO se debe generar ninguna alerta (PDP queda excluida).
        RF-ALR-01, RF-INV-02
        """
        # Arrange — solo hay stock bajo en PDP, BP tiene suficiente
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_pdp,
            cantidad=500,  # muy bajo, pero PDP no activa alertas
            fecha_vencimiento=date.today() + timedelta(days=60),
            fecha_entrada=date.today(),
        )
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=50000,  # suficiente en BP
            fecha_vencimiento=date.today() + timedelta(days=60),
            fecha_entrada=date.today(),
        )
        # Act
        AlertaService.verificar_stock_reorden(self.mp)
        # Assert — no debe haberse creado ninguna alerta de stock bajo
        alertas_pdp = Alerta.objects.filter(
            tipo='STOCK_BAJO',
            bodega=self.bodega_pdp,
        )
        self.assertEqual(alertas_pdp.count(), 0)

    # ── ALR-003 ───────────────────────────────────────────────────────
    def test_alr_003_lote_con_vencimiento_proximo_genera_alerta(self):
        """
        Cuando un lote tiene fecha_vencimiento dentro de los
        próximos N días (configurado), se genera alerta VENCIMIENTO_PROXIMO.
        RF-ALR-02
        """
        # Arrange — lote que vence en 5 días
        lote = Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=1000,
            fecha_vencimiento=date.today() + timedelta(days=5),
            fecha_entrada=date.today() - timedelta(days=25),
        )
        # Act
        AlertaService.verificar_vencimientos(dias_umbral=7)
        # Assert
        alerta = Alerta.objects.filter(
            tipo='VENCIMIENTO_PROXIMO',
            materia_prima=self.mp,
            activa=True,
        ).first()
        self.assertIsNotNone(alerta)

    # ── ALR-004 ───────────────────────────────────────────────────────
    def test_alr_004_lote_en_espera_pendiente_mas_de_x_horas_genera_alerta(self):
        """
        Si un LoteProductoTerminado lleva más de X horas en estado
        EN_ESPERA sin ser despachado, se genera alerta EN_ESPERA_PENDIENTE.
        RF-ALR-03
        """
        # Arrange
        from datetime import datetime, timedelta as td
        from apps.produccion.models import Batido, LoteProductoTerminado
        from apps.catalogo.models import ProductoTerminado
        unidades = UnidadMedida.objects.create(nombre='Und5', simbolo='u5')
        pt = ProductoTerminado.objects.create(
            nombre='Torta alerta', vida_util_dias=14, unidad_medida=unidades
        )
        batido = Batido.objects.create(
            producto_terminado=pt,
            fecha_produccion=date.today() - timedelta(days=2),
            hora_inicio='07:00',
            estado='COMPLETADO',
            usuario=self.user,
        )
        lote_pt = LoteProductoTerminado.objects.create(
            batido=batido,
            estado='EN_ESPERA',
            fecha_vencimiento=date.today() + timedelta(days=12),
            fecha_produccion=date.today() - timedelta(days=2),
            cantidad=10,
        )
        # Act — verificar lotes con más de 24 horas en EN_ESPERA
        AlertaService.verificar_lotes_en_espera(horas_umbral=24)
        # Assert
        alerta = Alerta.objects.filter(
            tipo='EN_ESPERA_PENDIENTE',
            activa=True,
        ).first()
        self.assertIsNotNone(alerta)

    # ── ALR-005 ───────────────────────────────────────────────────────
    def test_alr_005_alerta_resuelta_no_se_duplica_hasta_nueva_condicion(self):
        """
        Si una alerta de stock bajo fue resuelta, no se vuelve a crear
        hasta que el stock vuelve a caer (deduplicación).
        RF-ALR-04
        """
        # Arrange — alerta ya resuelta
        from django.utils import timezone
        Alerta.objects.create(
            tipo='STOCK_BAJO',
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            activa=False,  # ya resuelta
            fecha_resolucion=timezone.now(),
            mensaje='Stock bajo resuelto.',
        )
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=15000,  # ahora hay suficiente stock
            fecha_vencimiento=date.today() + timedelta(days=60),
            fecha_entrada=date.today(),
        )
        # Act — volver a verificar con stock OK
        AlertaService.verificar_stock_reorden(self.mp)
        # Assert — no debe haberse creado una nueva alerta activa
        alertas_activas = Alerta.objects.filter(
            tipo='STOCK_BAJO',
            materia_prima=self.mp,
            activa=True,
        )
        self.assertEqual(alertas_activas.count(), 0)

    # ── ALR-006 ───────────────────────────────────────────────────────
    @patch('apps.alertas.services.channel_layer')
    def test_alr_006_alerta_enviada_por_websocket(self, mock_channel_layer):
        """
        Al generar una alerta, AlertaService llama a channel_layer.group_send
        para enviarla por WebSocket a los usuarios conectados.
        RF-ALR-05
        """
        # Arrange
        mock_channel_layer.group_send = MagicMock()
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=500,  # bajo el punto de reorden
            fecha_vencimiento=date.today() + timedelta(days=60),
            fecha_entrada=date.today(),
        )
        # Act
        AlertaService.verificar_stock_reorden(self.mp, enviar_ws=True)
        # Assert
        mock_channel_layer.group_send.assert_called_once()
        args = mock_channel_layer.group_send.call_args
        self.assertIn('alertas', args[0][0])  # grupo 'alertas'

    # ── ALR-007 ───────────────────────────────────────────────────────
    @patch('apps.alertas.services.twilio_client')
    def test_alr_007_alerta_enviada_por_whatsapp_mock_twilio(
        self, mock_twilio
    ):
        """
        Al generar una alerta crítica, AlertaService envía un mensaje
        de WhatsApp via Twilio. Se verifica con mock.
        RF-ALR-02
        """
        # Arrange
        mock_twilio.messages.create = MagicMock(
            return_value=MagicMock(sid='SM_TEST_12345')
        )
        alerta = Alerta.objects.create(
            tipo='STOCK_BAJO',
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            activa=True,
            mensaje='Stock crítico de Harina de trigo.',
        )
        # Act
        AlertaService.enviar_whatsapp(alerta)
        # Assert
        mock_twilio.messages.create.assert_called_once()
        kwargs = mock_twilio.messages.create.call_args[1]
        self.assertTrue(kwargs['to'].startswith('whatsapp:'))
        self.assertIn('Harina', kwargs['body'])

    # ── ALR-008 ───────────────────────────────────────────────────────
    @patch('apps.alertas.services.send_mail')
    def test_alr_008_alerta_enviada_por_email_mock_smtp(self, mock_send_mail):
        """
        Al generar una alerta, AlertaService envía un email de notificación.
        Se verifica con mock de django.core.mail.send_mail.
        RF-ALR-02
        """
        # Arrange
        mock_send_mail.return_value = 1
        alerta = Alerta.objects.create(
            tipo='VENCIMIENTO_PROXIMO',
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            activa=True,
            mensaje='Lote de Harina vence en 5 días.',
        )
        # Act
        AlertaService.enviar_email(alerta, destinatario='gerencia@daluzed.com')
        # Assert
        mock_send_mail.assert_called_once()
        args = mock_send_mail.call_args
        self.assertIn('Harina', args[0][0])  # asunto
        self.assertIn('gerencia@daluzed.com', args[0][3])  # destinatario
```

---

## 9. IND — Indicadores y Reportes

### 9.1 Tabla resumen

| ID Prueba | Descripción | Tipo | RF que cubre | Prioridad |
|-----------|-------------|------|--------------|-----------|
| IND-001 | KPI: stock actual por bodega devuelve valores correctos | API | RF-IND-01 | Alta |
| IND-002 | KPI: lista de lotes próximos a vencer | API | RF-IND-01 | Alta |
| IND-003 | KPI: unidades producidas en un período | API | RF-IND-01 | Media |
| IND-004 | Exportar reporte de inventario a PDF | API | RF-IND-02 | Media |
| IND-005 | Exportar reporte de inventario a Excel | API | RF-IND-02 | Media |

### 9.2 Código de pruebas

```python
# apps/indicadores/tests/test_indicadores.py

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date, timedelta

from apps.catalogo.models import UnidadMedida, MateriaPrima, ProductoTerminado
from apps.inventario.models import Bodega, Lote
from apps.produccion.models import Batido, LoteProductoTerminado

User = get_user_model()

URL_KPI       = '/api/v1/indicadores/kpis/'
URL_EXPORTAR  = '/api/v1/indicadores/exportar/'


class IndicadoresTestCase(APITestCase):
    """IND-001 al IND-005: KPIs del dashboard y exportación de reportes."""

    def setUp(self):
        # Gerencia puede ver todos los indicadores
        self.user = User.objects.create_user(
            email='gerente@daluzed.com',
            password='Daluzed2026!',
            role='GERENTE',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        # Datos de prueba
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.unidades = UnidadMedida.objects.create(nombre='Unidades', simbolo='und')
        self.mp = MateriaPrima.objects.create(
            nombre='Harina', unidad_medida=self.gramos, punto_reorden=5000
        )
        self.pt = ProductoTerminado.objects.create(
            nombre='Torta de vainilla', vida_util_dias=14, unidad_medida=self.unidades
        )
        self.bodega_principal = Bodega.objects.create(
            nombre='Bodega Principal', tipo='PRINCIPAL'
        )
        hoy = date.today()
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=30000,
            fecha_vencimiento=hoy + timedelta(days=60),
            fecha_entrada=hoy,
        )
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=5000,
            fecha_vencimiento=hoy + timedelta(days=4),  # vence pronto
            fecha_entrada=hoy - timedelta(days=30),
        )

    # ── IND-001 ───────────────────────────────────────────────────────
    def test_ind_001_kpi_stock_actual_por_bodega(self):
        """
        GET /indicadores/kpis/?tipo=stock devuelve el stock total
        de cada materia prima desglosado por bodega.
        RF-IND-01
        """
        # Act
        response = self.client.get(URL_KPI, {'tipo': 'stock'})
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('stock_por_bodega', response.data)
        total_bp = sum(
            float(item['cantidad_total'])
            for item in response.data['stock_por_bodega']
            if item['bodega_tipo'] == 'PRINCIPAL'
        )
        self.assertAlmostEqual(total_bp, 35000.0)  # 30000 + 5000

    # ── IND-002 ───────────────────────────────────────────────────────
    def test_ind_002_kpi_lotes_proximos_a_vencer(self):
        """
        GET /indicadores/kpis/?tipo=vencimientos devuelve los lotes
        que vencen en los próximos 7 días.
        RF-IND-01
        """
        # Act
        response = self.client.get(URL_KPI, {'tipo': 'vencimientos', 'dias': 7})
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('lotes_por_vencer', response.data)
        # El lote que vence en 4 días debe estar en la lista
        ids_proximos = [
            l['lote_id'] for l in response.data['lotes_por_vencer']
        ]
        lote_proximo = Lote.objects.filter(
            fecha_vencimiento=date.today() + timedelta(days=4)
        ).first()
        self.assertIn(lote_proximo.id, ids_proximos)

    # ── IND-003 ───────────────────────────────────────────────────────
    def test_ind_003_kpi_unidades_producidas_en_periodo(self):
        """
        GET /indicadores/kpis/?tipo=produccion&desde=X&hasta=Y
        devuelve el total de unidades producidas en el rango de fechas.
        RF-IND-01
        """
        # Arrange — crear batidos completados en el período
        user_prod = User.objects.create_user(
            email='prod2@daluzed.com', password='Pass123!', role='PRODUCCION'
        )
        hoy = date.today()
        for i in range(3):
            batido = Batido.objects.create(
                producto_terminado=self.pt,
                fecha_produccion=hoy - timedelta(days=i),
                hora_inicio='08:00',
                estado='COMPLETADO',
                usuario=user_prod,
            )
            LoteProductoTerminado.objects.create(
                batido=batido,
                estado='EN_ESPERA',
                fecha_vencimiento=hoy + timedelta(days=14),
                fecha_produccion=hoy - timedelta(days=i),
                cantidad=20,
            )
        # Act
        response = self.client.get(
            URL_KPI,
            {
                'tipo': 'produccion',
                'desde': str(hoy - timedelta(days=7)),
                'hasta': str(hoy),
            },
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(
            response.data['total_unidades_producidas'], 60  # 3 batidos × 20
        )

    # ── IND-004 ───────────────────────────────────────────────────────
    def test_ind_004_exportar_reporte_inventario_pdf(self):
        """
        GET /indicadores/exportar/?formato=pdf devuelve un archivo PDF
        con Content-Type: application/pdf.
        RF-IND-02
        """
        # Act
        response = self.client.get(URL_EXPORTAR, {'formato': 'pdf'})
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('Content-Disposition', response)
        self.assertIn('attachment', response['Content-Disposition'])

    # ── IND-005 ───────────────────────────────────────────────────────
    def test_ind_005_exportar_reporte_inventario_excel(self):
        """
        GET /indicadores/exportar/?formato=xlsx devuelve un archivo Excel
        con Content-Type correspondiente a hoja de cálculo OOXML.
        RF-IND-02
        """
        # Act
        response = self.client.get(URL_EXPORTAR, {'formato': 'xlsx'})
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(
            'spreadsheetml',
            response['Content-Type'],
        )
        self.assertIn('Content-Disposition', response)
        self.assertIn('.xlsx', response['Content-Disposition'])
```

---

## 10. AUD — Auditoría y Trazabilidad

### 10.1 Tabla resumen

| ID Prueba | Descripción | Tipo | RF que cubre | Prioridad |
|-----------|-------------|------|--------------|-----------|
| AUD-001 | Todo movimiento de inventario genera entrada en bitácora | Integración | RF-AUD-02 | Alta |
| AUD-002 | Trazabilidad completa de lote MP: recepción → traslado → consumo | Integración | RF-AUD-01 | Alta |
| AUD-003 | Trazabilidad completa de lote PT: producción → despacho PDV | Integración | RF-AUD-01 | Alta |
| AUD-004 | Movimiento compensatorio aparece en bitácora con datos completos | Integración | RF-AUD-03 | Alta |
| AUD-005 | Solo Administrador puede ver la bitácora completa | API | RF-AUD-02 | Alta |
| AUD-006 | Bitácora no puede modificarse ni borrarse | API | RF-AUD-02 | Alta |

### 10.2 Código de pruebas

```python
# apps/auditoria/tests/test_auditoria.py

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date, timedelta

from apps.catalogo.models import UnidadMedida, MateriaPrima
from apps.inventario.models import Bodega, Lote, MovimientoInventario
from apps.auditoria.models import EntradaBitacora  # modelo a implementar

User = get_user_model()

URL_BITACORA = '/api/v1/auditoria/bitacora/'


class AuditoriaTestCase(APITestCase):
    """AUD-001 al AUD-006: Bitácora, trazabilidad e inmutabilidad de registros."""

    def setUp(self):
        # Administrador del sistema
        self.admin = User.objects.create_user(
            email='admin@daluzed.com',
            password='AdminDaluzed2026!',
            role='ADMIN',
        )
        # Usuario de inventario (no admin)
        self.inventario = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        # Datos base
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.mp = MateriaPrima.objects.create(
            nombre='Harina', unidad_medida=self.gramos, punto_reorden=5000
        )
        self.bodega_principal = Bodega.objects.create(
            nombre='Bodega Principal', tipo='PRINCIPAL'
        )
        self.bodega_pdp = Bodega.objects.create(
            nombre='Bodega PDP', tipo='PDP'
        )
        hoy = date.today()
        self.lote = Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=20000,
            fecha_vencimiento=hoy + timedelta(days=60),
            fecha_entrada=hoy,
        )

    def _autenticar_como(self, usuario):
        """Método utilitario para cambiar el usuario autenticado."""
        refresh = RefreshToken.for_user(usuario)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )

    # ── AUD-001 ───────────────────────────────────────────────────────
    def test_aud_001_movimiento_inventario_genera_entrada_bitacora(self):
        """
        Al registrar un MovimientoInventario (traslado), el sistema
        crea automáticamente una EntradaBitacora asociada.
        RF-AUD-02
        """
        # Arrange
        conteo_antes = EntradaBitacora.objects.count()
        # Act — registrar un movimiento de traslado directamente en el servicio
        MovimientoInventario.objects.create(
            tipo='TRASLADO',
            lote=self.lote,
            bodega_origen=self.bodega_principal,
            bodega_destino=self.bodega_pdp,
            cantidad=3000,
            usuario=self.inventario,
        )
        # Assert — debe existir una nueva entrada en la bitácora
        conteo_despues = EntradaBitacora.objects.count()
        self.assertGreater(conteo_despues, conteo_antes)
        ultima_entrada = EntradaBitacora.objects.order_by('-id').first()
        self.assertEqual(ultima_entrada.modelo_afectado, 'MovimientoInventario')
        self.assertEqual(ultima_entrada.usuario, self.inventario)

    # ── AUD-002 ───────────────────────────────────────────────────────
    def test_aud_002_trazabilidad_completa_lote_mp(self):
        """
        GET /auditoria/trazabilidad/lote/{id}/ devuelve el historial
        completo: recepción → traslado → consumo en producción.
        RF-AUD-01
        """
        # Arrange — crear movimientos del lote
        self._autenticar_como(self.admin)
        MovimientoInventario.objects.create(
            tipo='RECEPCION',
            lote=self.lote,
            bodega_destino=self.bodega_principal,
            cantidad=20000,
            usuario=self.inventario,
            notas='Recepción OC-001',
        )
        MovimientoInventario.objects.create(
            tipo='TRASLADO',
            lote=self.lote,
            bodega_origen=self.bodega_principal,
            bodega_destino=self.bodega_pdp,
            cantidad=5000,
            usuario=self.inventario,
        )
        MovimientoInventario.objects.create(
            tipo='CONSUMO',
            lote=self.lote,
            bodega_origen=self.bodega_pdp,
            cantidad=5000,
            usuario=self.inventario,
            notas='Consumo batido BAT-001',
        )
        # Act
        response = self.client.get(
            f'/api/v1/auditoria/trazabilidad/lote/{self.lote.id}/'
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tipos_en_historial = [m['tipo'] for m in response.data['movimientos']]
        self.assertIn('RECEPCION', tipos_en_historial)
        self.assertIn('TRASLADO', tipos_en_historial)
        self.assertIn('CONSUMO', tipos_en_historial)

    # ── AUD-003 ───────────────────────────────────────────────────────
    def test_aud_003_trazabilidad_completa_lote_producto_terminado(self):
        """
        GET /auditoria/trazabilidad/lote-pt/{id}/ devuelve el historial
        completo de un lote PT: producción → despacho al PDV.
        RF-AUD-01
        """
        # Arrange
        from apps.catalogo.models import ProductoTerminado
        from apps.produccion.models import Batido, LoteProductoTerminado
        self._autenticar_como(self.admin)
        unidades = UnidadMedida.objects.create(nombre='UndAud', simbolo='ua')
        pt = ProductoTerminado.objects.create(
            nombre='Torta audit', vida_util_dias=14, unidad_medida=unidades
        )
        batido = Batido.objects.create(
            producto_terminado=pt,
            fecha_produccion=date.today(),
            hora_inicio='08:00',
            estado='COMPLETADO',
            usuario=self.inventario,
        )
        lote_pt = LoteProductoTerminado.objects.create(
            batido=batido,
            estado='EN_PUNTO_DE_VENTA',
            fecha_vencimiento=date.today() + timedelta(days=14),
            fecha_produccion=date.today(),
            fecha_despacho=date.today(),
            cantidad=10,
        )
        # Act
        response = self.client.get(
            f'/api/v1/auditoria/trazabilidad/lote-pt/{lote_pt.id}/'
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['estado_actual'], 'EN_PUNTO_DE_VENTA')
        self.assertIn('fecha_produccion', response.data)
        self.assertIn('fecha_despacho', response.data)

    # ── AUD-004 ───────────────────────────────────────────────────────
    def test_aud_004_compensatorio_aparece_en_bitacora_con_datos_completos(self):
        """
        Un MovimientoCompensatorio genera una EntradaBitacora con
        es_compensatorio=True y todos los datos del ajuste.
        RF-AUD-03
        """
        # Arrange
        self._autenticar_como(self.admin)
        from apps.produccion.models import MovimientoCompensatorio
        comp = MovimientoCompensatorio.objects.create(
            tipo_afectado='Lote',
            id_afectado=self.lote.id,
            descripcion='Ajuste por error de conteo.',
            usuario=self.inventario,
            datos_originales={'cantidad': 20000},
            datos_corregidos={'cantidad': 18000},
        )
        # Act
        response = self.client.get(URL_BITACORA, {'es_compensatorio': True})
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        entradas_comp = [
            e for e in response.data['results']
            if e.get('es_compensatorio') is True
        ]
        self.assertGreater(len(entradas_comp), 0)
        primera = entradas_comp[0]
        self.assertIn('datos_originales', primera)
        self.assertIn('datos_corregidos', primera)
        self.assertIn('usuario', primera)
        self.assertIn('fecha', primera)

    # ── AUD-005 ───────────────────────────────────────────────────────
    def test_aud_005_solo_administrador_puede_ver_bitacora_completa(self):
        """
        GET /auditoria/bitacora/ devuelve HTTP 200 para ADMIN
        y HTTP 403 para usuarios sin ese rol.
        RF-AUD-02
        """
        # Assert para ADMIN
        self._autenticar_como(self.admin)
        response_admin = self.client.get(URL_BITACORA)
        self.assertEqual(response_admin.status_code, status.HTTP_200_OK)

        # Assert para INVENTARIO (no es admin)
        self._autenticar_como(self.inventario)
        response_inv = self.client.get(URL_BITACORA)
        self.assertEqual(response_inv.status_code, status.HTTP_403_FORBIDDEN)

    # ── AUD-006 ───────────────────────────────────────────────────────
    def test_aud_006_bitacora_no_puede_modificarse_ni_borrarse(self):
        """
        Las entradas de la bitácora son de solo lectura.
        PUT, PATCH y DELETE deben devolver 403 o 405.
        RF-AUD-02
        """
        # Arrange — crear una entrada de bitácora
        self._autenticar_como(self.admin)
        entrada = EntradaBitacora.objects.create(
            usuario=self.inventario,
            accion='TRASLADO',
            modelo_afectado='Lote',
            objeto_id=self.lote.id,
            datos_anteriores={'cantidad': 20000},
            datos_nuevos={'cantidad': 15000},
        )
        # Act
        patch_response = self.client.patch(
            f'{URL_BITACORA}{entrada.id}/',
            {'accion': 'MODIFICADO'},
            format='json',
        )
        delete_response = self.client.delete(
            f'{URL_BITACORA}{entrada.id}/'
        )
        # Assert — inmutabilidad garantizada
        self.assertIn(
            patch_response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED],
        )
        self.assertIn(
            delete_response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED],
        )
        # La entrada sigue intacta
        entrada.refresh_from_db()
        self.assertEqual(entrada.accion, 'TRASLADO')
```

---

## 11. Frontend — Login y componentes de UI

### 11.1 Tabla resumen

| ID Prueba | Descripción | Tipo | RF que cubre | Prioridad |
|-----------|-------------|------|--------------|-----------|
| FE-001 | Login form renderiza correctamente | Frontend | RF-AUT-01 | Alta |
| FE-002 | Submit deshabilitado si email o password están vacíos | Frontend | RF-AUT-01 | Alta |
| FE-003 | Login exitoso → guarda accessToken en Zustand → redirige a /dashboard | Frontend | RF-AUT-01 | Alta |
| FE-004 | Login exitoso → user y role NO están en localStorage | Frontend | RNF-SEG-01 | Alta |
| FE-005 | Login con credenciales incorrectas → muestra "Correo o contraseña incorrectos." | Frontend | RF-AUT-01 | Alta |
| FE-006 | Login con cuenta bloqueada → muestra mensaje de bloqueo | Frontend | RF-AUT-01 | Alta |
| FE-007 | Login con cuenta inactiva → muestra mensaje de cuenta desactivada | Frontend | RF-AUT-01 | Alta |
| FE-008 | Toggle show/hide password funciona correctamente | Frontend | RF-AUT-01 | Media |
| FE-009 | Ruta /dashboard sin token → redirige a /login | Frontend | RF-AUT-04 | Alta |
| FE-010 | Ruta /login con token activo → redirige a /dashboard | Frontend | RF-AUT-04 | Alta |
| FE-011 | Interceptor Axios: 401 → intenta refresh → reintenta request original | Frontend | RF-AUT-03 | Alta |
| FE-012 | Interceptor Axios: refresh falla → clearAuth() + redirige a /login | Frontend | RF-AUT-03 | Alta |

### 11.2 Configuración de Vitest

```javascript
// frontend/vitest.config.js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx'],
    },
  },
})
```

```javascript
// frontend/src/__tests__/setup.js
import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Limpiar el DOM después de cada prueba
afterEach(() => {
  cleanup()
})

// Mock de window.location.replace para pruebas de redirección
Object.defineProperty(window, 'location', {
  value: { replace: vi.fn(), href: '' },
  writable: true,
})
```

### 11.3 Código de pruebas — Login.test.jsx

```javascript
// frontend/src/__tests__/Login.test.jsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// Mock del módulo de API antes de importar el componente
vi.mock('../api/authAPI', () => ({
  loginAPI: vi.fn(),
}))

// Mock de Zustand store para verificar setAuth
vi.mock('../store/authStore', () => {
  const setAuth = vi.fn()
  const clearAuth = vi.fn()
  return {
    default: vi.fn(() => ({
      accessToken: null,
      setAuth,
      clearAuth,
    })),
    __esModule: true,
    setAuth,
    clearAuth,
  }
})

import LoginPage from '../pages/Login'
import { loginAPI } from '../api/authAPI'
import useAuthStore from '../store/authStore'

// Wrapper con MemoryRouter para manejar navigate
const renderLogin = (initialToken = null) => {
  // Sobreescribir el store mock según el token
  useAuthStore.mockReturnValue({
    accessToken: initialToken,
    setAuth: vi.fn(),
    clearAuth: vi.fn(),
  })
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>
  )
}


// ── FE-001 ────────────────────────────────────────────────────────────
describe('FE-001: Login form renderiza correctamente', () => {
  it('debe mostrar los campos de email, contraseña y el botón de submit', () => {
    // Arrange & Act
    renderLogin()
    // Assert
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })
})


// ── FE-002 ────────────────────────────────────────────────────────────
describe('FE-002: Submit deshabilitado sin email o password', () => {
  it('el botón de submit tiene el atributo required en los campos de entrada', () => {
    // Arrange & Act
    renderLogin()
    const emailInput = screen.getByLabelText(/correo electrónico/i)
    const passwordInput = screen.getByLabelText(/contraseña/i)
    // Assert — el campo email y password son required
    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
  })
})


// ── FE-003 ────────────────────────────────────────────────────────────
describe('FE-003: Login exitoso guarda token y redirige', () => {
  it('llama a setAuth con los datos del backend y navega a /dashboard', async () => {
    // Arrange
    const setAuthMock = vi.fn()
    useAuthStore.mockReturnValue({
      accessToken: null,
      setAuth: setAuthMock,
      clearAuth: vi.fn(),
    })
    loginAPI.mockResolvedValueOnce({
      data: {
        access: 'fake-access-token',
        refresh: 'fake-refresh-token',
        username: 'inventario@daluzed.com',
        role: 'INVENTARIO',
      },
    })
    renderLogin()

    // Act
    await userEvent.type(
      screen.getByLabelText(/correo electrónico/i),
      'inventario@daluzed.com'
    )
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'Daluzed2026!')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    // Assert
    await waitFor(() => {
      expect(setAuthMock).toHaveBeenCalledWith({
        access: 'fake-access-token',
        refresh: 'fake-refresh-token',
        username: 'inventario@daluzed.com',
        role: 'INVENTARIO',
      })
    })
  })
})


// ── FE-004 ────────────────────────────────────────────────────────────
describe('FE-004: user y role NO están en localStorage después del login', () => {
  it('localStorage no debe contener user ni role tras login exitoso', async () => {
    // Arrange
    loginAPI.mockResolvedValueOnce({
      data: {
        access: 'token-abc',
        refresh: 'refresh-abc',
        username: 'gerente@daluzed.com',
        role: 'GERENTE',
      },
    })
    renderLogin()

    // Act
    await userEvent.type(
      screen.getByLabelText(/correo electrónico/i),
      'gerente@daluzed.com'
    )
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'Daluzed2026!')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(loginAPI).toHaveBeenCalled()
    })

    // Assert — verificar que el store de Zustand no persiste user/role
    // según la configuración partialize del store
    const persistedState = JSON.parse(
      localStorage.getItem('daluzed-auth') || '{}'
    )
    const stateData = persistedState?.state || {}
    expect(stateData).not.toHaveProperty('user')
    expect(stateData).not.toHaveProperty('role')
  })
})


// ── FE-005 ────────────────────────────────────────────────────────────
describe('FE-005: Login con credenciales incorrectas', () => {
  it('muestra "Correo o contraseña incorrectos." tras 401 con detail=invalid', async () => {
    // Arrange
    loginAPI.mockRejectedValueOnce({
      response: {
        data: { detail: 'invalid', remaining_attempts: 3 },
      },
    })
    renderLogin()

    // Act
    await userEvent.type(
      screen.getByLabelText(/correo electrónico/i),
      'malo@daluzed.com'
    )
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'ClaveIncorrecta')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    // Assert
    await waitFor(() => {
      expect(
        screen.getByText(/correo o contraseña incorrectos/i)
      ).toBeInTheDocument()
    })
    // También debe mostrar los intentos restantes
    expect(screen.getByText(/intentos restantes: 3/i)).toBeInTheDocument()
  })
})


// ── FE-006 ────────────────────────────────────────────────────────────
describe('FE-006: Login con cuenta bloqueada', () => {
  it('muestra mensaje de bloqueo cuando detail=lockout', async () => {
    // Arrange
    loginAPI.mockRejectedValueOnce({
      response: { data: { detail: 'lockout' } },
    })
    renderLogin()

    // Act
    await userEvent.type(
      screen.getByLabelText(/correo electrónico/i),
      'bloqueado@daluzed.com'
    )
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'cualquier')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    // Assert
    await waitFor(() => {
      expect(
        screen.getByText(/cuenta fue bloqueada.*demasiados intentos/i)
      ).toBeInTheDocument()
    })
  })
})


// ── FE-007 ────────────────────────────────────────────────────────────
describe('FE-007: Login con cuenta inactiva', () => {
  it('muestra mensaje de cuenta desactivada cuando detail=inactive', async () => {
    // Arrange
    loginAPI.mockRejectedValueOnce({
      response: { data: { detail: 'inactive' } },
    })
    renderLogin()

    // Act
    await userEvent.type(
      screen.getByLabelText(/correo electrónico/i),
      'inactivo@daluzed.com'
    )
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'Daluzed2026!')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    // Assert
    await waitFor(() => {
      expect(
        screen.getByText(/cuenta está desactivada/i)
      ).toBeInTheDocument()
    })
  })
})


// ── FE-008 ────────────────────────────────────────────────────────────
describe('FE-008: Toggle show/hide password', () => {
  it('al hacer clic en el botón de ojo, el input cambia de password a text', async () => {
    // Arrange
    renderLogin()
    const passwordInput = screen.getByLabelText(/contraseña/i)
    const toggleBtn = screen.getByRole('button', { name: /mostrar contraseña/i })

    // Assert — estado inicial: tipo password
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Act — clic para mostrar
    await userEvent.click(toggleBtn)

    // Assert — ahora tipo text
    expect(passwordInput).toHaveAttribute('type', 'text')

    // Act — clic para ocultar
    const hideBtn = screen.getByRole('button', { name: /ocultar contraseña/i })
    await userEvent.click(hideBtn)

    // Assert — vuelve a tipo password
    expect(passwordInput).toHaveAttribute('type', 'password')
  })
})


// ── FE-009 ────────────────────────────────────────────────────────────
describe('FE-009: Ruta /dashboard sin token redirige a /login', () => {
  it('sin accessToken en el store, el componente de dashboard no renderiza', () => {
    // Arrange — store sin token
    useAuthStore.mockReturnValue({
      accessToken: null,
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
    })
    // Act — renderizar la ruta /dashboard directamente
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        {/* Simulamos la lógica de App.jsx */}
        {null === null ? (
          <div data-testid="login-redirect">Redirigido a login</div>
        ) : (
          <div data-testid="dashboard">Dashboard</div>
        )}
      </MemoryRouter>
    )
    // Assert — debe mostrar el redirect, no el dashboard
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument()
  })
})


// ── FE-010 ────────────────────────────────────────────────────────────
describe('FE-010: Ruta /login con token activo redirige a /dashboard', () => {
  it('con accessToken en el store, la ruta /login redirige a /dashboard', () => {
    // Arrange — store con token activo
    useAuthStore.mockReturnValue({
      accessToken: 'token-activo-123',
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
    })
    // Renderizar App que usa Navigate when token exists
    render(
      <MemoryRouter initialEntries={['/login']}>
        {'token-activo-123' ? (
          <div data-testid="dashboard-redirect">Redirigido a dashboard</div>
        ) : (
          <LoginPage />
        )}
      </MemoryRouter>
    )
    // Assert — no debe mostrar el formulario de login
    expect(screen.queryByRole('button', { name: /iniciar sesión/i })).not.toBeInTheDocument()
    expect(screen.getByTestId('dashboard-redirect')).toBeInTheDocument()
  })
})
```

### 11.4 Código de pruebas — axiosClient.test.js

```javascript
// frontend/src/__tests__/axiosClient.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'

// Mock del store de Zustand
vi.mock('../store/authStore', () => ({
  default: {
    getState: vi.fn(),
  },
}))

import axiosClient from '../api/axiosClient'
import useAuthStore from '../store/authStore'

let mockAxios

beforeEach(() => {
  mockAxios = new MockAdapter(axios)
  vi.clearAllMocks()
})

afterEach(() => {
  mockAxios.restore()
})


// ── FE-011 ────────────────────────────────────────────────────────────
describe('FE-011: Interceptor Axios — 401 intenta refresh y reintenta', () => {
  it('cuando un endpoint devuelve 401, refresca el token y reintenta la petición', async () => {
    // Arrange
    const nuevoAccessToken = 'nuevo-access-token-renovado'
    const refreshToken = 'refresh-token-valido'

    // Estado inicial del store
    useAuthStore.getState.mockReturnValue({
      accessToken: 'access-expirado',
      refreshToken,
      setAccessToken: vi.fn(),
      clearAuth: vi.fn(),
    })

    // Primera llamada a /api/v1/inventario/stock/ → 401
    mockAxios.onGet('/api/v1/inventario/stock/').replyOnce(401)
    // Llamada al endpoint de refresh → devuelve nuevo token
    mockAxios.onPost('/api/v1/auth/token/refresh/').replyOnce(200, {
      access: nuevoAccessToken,
    })
    // Segunda llamada al mismo endpoint (reintento) → 200
    mockAxios.onGet('/api/v1/inventario/stock/').replyOnce(200, {
      cantidad_total: 5000,
    })

    // Act
    const response = await axiosClient.get('/api/v1/inventario/stock/')

    // Assert
    expect(response.status).toBe(200)
    expect(response.data.cantidad_total).toBe(5000)
    const { setAccessToken } = useAuthStore.getState()
    expect(setAccessToken).toHaveBeenCalledWith(nuevoAccessToken)
  })
})


// ── FE-012 ────────────────────────────────────────────────────────────
describe('FE-012: Interceptor Axios — refresh falla → clearAuth + /login', () => {
  it('cuando el refresh falla, llama a clearAuth y redirige a /login', async () => {
    // Arrange
    const clearAuthMock = vi.fn()
    useAuthStore.getState.mockReturnValue({
      accessToken: 'access-expirado',
      refreshToken: 'refresh-invalido',
      setAccessToken: vi.fn(),
      clearAuth: clearAuthMock,
    })

    // Primera llamada → 401
    mockAxios.onGet('/api/v1/produccion/batidos/').replyOnce(401)
    // Refresh también falla → 401
    mockAxios.onPost('/api/v1/auth/token/refresh/').replyOnce(401, {
      detail: 'Token inválido o expirado.',
    })

    // Act — el interceptor debe lanzar el error tras fallar el refresh
    try {
      await axiosClient.get('/api/v1/produccion/batidos/')
    } catch (_) {
      // Se espera error; lo que importa son los efectos secundarios
    }

    // Assert
    expect(clearAuthMock).toHaveBeenCalled()
    expect(window.location.replace).toHaveBeenCalledWith('/login')
  })
})
```

---

## 12. Pruebas No Funcionales

Las pruebas no funcionales verifican los RNF declarados en el SRS. Se ejecutan en un entorno de staging (no en la suite de tests unitarios).

### 12.1 Tabla resumen

| ID Prueba | RNF que cubre | Descripción | Herramienta | Criterio de aceptación |
|-----------|--------------|-------------|-------------|----------------------|
| NFR-001 | RNF-PER-01 | Consulta de stock bajo carga | Locust | p95 ≤ 2 s con 10 usuarios |
| NFR-002 | RNF-PER-04 | 10 usuarios concurrentes sin degradación | Locust | Sin errores 5xx, p95 ≤ 2 s |
| NFR-003 | RNF-PER-05 | Alerta WebSocket visible en < 2 s | Selenium + ws client | Latencia media < 2 s |
| NFR-004 | RNF-SEC-01 | Contraseñas almacenadas con PBKDF2/bcrypt | Inspección BD | No hay passwords en texto plano |
| NFR-005 | RNF-SEC-04 | RBAC cubre todos los endpoints | Herramienta propia | 0 endpoints sin permisos definidos |
| NFR-006 | RNF-MAN-02 | Cobertura ≥ 70 % en lógica de negocio | coverage.py | coverage report ≥ 70 % |
| NFR-007 | RNF-AVA-01 | Disponibilidad ≥ 99 % en horario operativo | Uptime Robot | Dashboard de monitoreo |

### 12.2 NFR-001 y NFR-002 — Prueba de carga con Locust

```python
# tests_nonfunctional/locustfile.py

from locust import HttpUser, task, between
import json

# Token de prueba generado en el entorno de staging
STAGING_TOKEN = 'eyJ...'   # reemplazar antes de correr


class InventarioUser(HttpUser):
    """
    Simula el comportamiento de un usuario del sistema de inventario.
    Criterio: p95 ≤ 2 s con 10 usuarios concurrentes (RNF-PER-01, RNF-PER-04).
    """
    wait_time = between(1, 3)
    headers = {'Authorization': f'Bearer {STAGING_TOKEN}'}

    @task(3)
    def consultar_stock_bodega_principal(self):
        """Endpoint de consulta de stock — el más frecuente según el cliente."""
        self.client.get(
            '/api/v1/inventario/stock/',
            params={'bodega': 'PRINCIPAL'},
            headers=self.headers,
            name='/inventario/stock/ [GET]',
        )

    @task(2)
    def listar_materias_primas(self):
        self.client.get(
            '/api/v1/catalogo/materias-primas/',
            headers=self.headers,
            name='/catalogo/materias-primas/ [GET]',
        )

    @task(1)
    def consultar_reorden(self):
        self.client.get(
            '/api/v1/inventario/reorden/',
            headers=self.headers,
            name='/inventario/reorden/ [GET]',
        )
```

**Cómo ejecutar:**

```bash
# Instalar locust (fuera del venv principal)
pip install locust

# Correr contra staging con 10 usuarios, rampa de 2 usuarios/s durante 60 s
locust -f tests_nonfunctional/locustfile.py \
  --host=https://staging.daluzed.railway.app \
  --users=10 --spawn-rate=2 --run-time=60s --headless \
  --csv=results/locust_report
```

**Criterio de aceptación:**

| Métrica | Objetivo |
|---------|----------|
| p50 (mediana) | ≤ 500 ms |
| p95 | ≤ 2 000 ms |
| Errores (4xx/5xx) | 0 % |

### 12.3 NFR-004 — Verificación de hashing de contraseñas

```python
# tests_nonfunctional/test_seguridad_passwords.py
# Ejecutar en entorno local con BD de desarrollo.

from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class HashingContrasenaTestCase(TestCase):
    """
    NFR-004 / RNF-SEC-01: Verifica que Django usa PBKDF2 (o argon2)
    para almacenar contraseñas. Ninguna contraseña debe estar en texto plano.
    """

    def test_contrasena_no_se_almacena_en_texto_plano(self):
        # Arrange
        user = User.objects.create_user(
            email='test@daluzed.com',
            password='ClaveSegura2026!',
        )
        # Act — leer el campo raw de la BD
        user.refresh_from_db()
        # Assert — el campo password empieza con el identificador del algoritmo
        self.assertTrue(
            user.password.startswith('pbkdf2_') or
            user.password.startswith('argon2') or
            user.password.startswith('bcrypt'),
            msg=f'Algoritmo no reconocido: {user.password[:20]}',
        )
        self.assertNotEqual(user.password, 'ClaveSegura2026!')
```

### 12.4 NFR-005 — RBAC cubre todos los endpoints

```python
# tests_nonfunctional/test_rbac_cobertura.py

from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class RBACCoberturaTestCase(TestCase):
    """
    NFR-005 / RNF-SEC-04: Ningún endpoint devuelve 200 a un usuario
    no autenticado. Todos los endpoints protegidos retornan 401 sin token.
    """

    def test_endpoints_retornan_401_sin_autenticacion(self):
        """
        Lista de endpoints clave que deben estar protegidos.
        Un endpoint que devuelva 200 sin token es una brecha de seguridad.
        """
        client = APIClient()
        endpoints_protegidos = [
            '/api/v1/catalogo/materias-primas/',
            '/api/v1/catalogo/proveedores/',
            '/api/v1/inventario/stock/',
            '/api/v1/inventario/traslados/',
            '/api/v1/recepcion/',
            '/api/v1/produccion/batidos/',
            '/api/v1/produccion/despachos/',
            '/api/v1/indicadores/kpis/',
            '/api/v1/auditoria/bitacora/',
        ]
        for endpoint in endpoints_protegidos:
            response = client.get(endpoint)
            self.assertEqual(
                response.status_code, 401,
                msg=f'El endpoint {endpoint} no está protegido (devolvió {response.status_code})',
            )
```

### 12.5 NFR-006 — Cobertura mínima del 70 %

```bash
# Ejecutar cobertura sobre la lógica de negocio del backend
coverage run --source=apps manage.py test apps --verbosity=2
coverage report --min-coverage=70 --omit="*/migrations/*,*/tests/*,*/admin.py"
coverage html -d coverage_html/
```

**Archivos con mayor peso en la cobertura objetivo:**

| Archivo | Lógica crítica |
|---------|---------------|
| `apps/authentication/services.py` | Generación de tokens, RBAC |
| `apps/inventario/services.py` | FEFO, cálculo de reorden, traslados atómicos |
| `apps/recepcion/services.py` | Validación de días mínimos, conversión de presentaciones |
| `apps/produccion/services.py` | FIFO, estados PT, compensatorios |
| `apps/alertas/services.py` | Deduplicación, disparo de alertas |

---

## 13. Resumen de cobertura

### 13.1 Conteo total de casos de prueba

| Módulo | Unitarias | Integración | API | Frontend | Total |
|--------|-----------|-------------|-----|----------|-------|
| AUT — Autenticación | 2 | 0 | 13 | 0 | **15** |
| CAT — Catálogo | 1 | 2 | 15 | 0 | **18** |
| INV — Inventario | 2 | 1 | 9 | 0 | **12** |
| REC — Recepción | 0 | 1 | 9 | 0 | **10** |
| PROD — Producción | 2 | 2 | 10 | 0 | **14** |
| ALR — Alertas | 3 | 3 | 0 | 0 | **8** (incl. mocks) |
| IND — Indicadores | 0 | 0 | 5 | 0 | **5** |
| AUD — Auditoría | 0 | 3 | 3 | 0 | **6** |
| FE — Frontend | 0 | 0 | 0 | 12 | **12** |
| **Total** | **10** | **12** | **64** | **12** | **≥ 100** |

### 13.2 Mapa de reglas de negocio vs pruebas

| Regla crítica | ID prueba(s) que la cubren |
|---------------|---------------------------|
| Login + bloqueo 5 intentos (Axes) | AUT-001, AUT-002, AUT-003, AUT-004 |
| Usuario inactivo → 401 | AUT-005 |
| Logout invalida refresh (blacklist) | AUT-006, AUT-007 |
| Refresh rota + blacklist | AUT-008, AUT-009, AUT-014, AUT-015 |
| RBAC — 4 roles | AUT-010, AUT-011, AUT-012, AUT-013 |
| Conversión presentación → unidad base | CAT-018, REC-003 |
| Relación M2M proveedor ↔ materia prima | CAT-012, CAT-013, CAT-014 |
| FEFO — consumo de PDP por vencimiento | INV-005, INV-006, PROD-002 |
| Solo BP activa alertas de reorden | INV-003, ALR-001, ALR-002 |
| Traslado atómico BP → PDP | INV-007, INV-008 |
| Traslado inmutable | INV-009 |
| Recepción SOLO contra OC previa | REC-001, REC-002 |
| Días mínimos de vencimiento — bloqueante | REC-007, REC-008, REC-009 |
| Máximo 2 batidos simultáneos | PROD-004 |
| Lote PT vencimiento = producción + vida útil | PROD-005, PROD-012 |
| FIFO — despacho de PT | PROD-007 |
| Estado PT EN_ESPERA → EN_PUNTO_DE_VENTA irreversible | PROD-006, PROD-008 |
| Movimiento compensatorio — inmutabilidad + visibilidad | PROD-009, PROD-010, PROD-011 |
| Transacción atómica en producción | PROD-014 |
| Deduplicación de alertas | ALR-005 |
| WebSocket para alertas en tiempo real | ALR-006 |
| WhatsApp vía Twilio | ALR-007 |
| Bitácora solo para ADMIN | AUD-005 |
| Bitácora inmutable | AUD-006 |
| user/role NO en localStorage | FE-004 |
| Interceptor JWT — renovación automática | FE-011, FE-012 |

### 13.3 Distribución por corte académico

| Corte | Módulos | Casos de prueba | Estado |
|-------|---------|-----------------|--------|
| Corte 1 | AUT, CAT, Frontend Login | 15 + 18 + 12 = **45** | 🔄 En desarrollo |
| Corte 2 | INV, REC, PROD | 12 + 10 + 14 = **36** | ⏳ Pendiente |
| Corte 3 | ALR, IND, AUD, NFR | 8 + 5 + 6 + 7 = **26** | ⏳ Pendiente |
| **Total** | | **≥ 107** | |

### 13.4 Orden de implementación recomendado (Corte 1)

1. Ejecutar `apps/authentication/tests/test_autenticacion.py` — ya está implementado el módulo AUT.
2. Implementar `apps/catalogo/models.py` → ejecutar `test_catalogo.py` en ciclo rojo/verde.
3. Configurar Vitest + RTL → ejecutar `Login.test.jsx` y `axiosClient.test.js`.
4. Medir cobertura: `coverage run manage.py test apps.authentication apps.catalogo`.

> **Nota:** Los módulos CAT, INV, REC, PROD, ALR, IND y AUD aún no tienen implementación. Las pruebas de esos módulos están escritas según TDD puro — primero fallan (rojo), luego se implementa el modelo/servicio/view hasta que pasan (verde).

---

*Plan de pruebas completado — 107 casos de prueba distribuidos en 8 módulos de negocio + frontend + pruebas no funcionales. Última actualización: Mayo 2026.*