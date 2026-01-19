@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════════
echo   MIGRAÇÃO DO SISTEMA DE EDITAIS - MEMODROPS
echo ═══════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

echo Verificando arquivo de migração...
if not exist "apps\backend\src\db\migrations\0014_editais_system.sql" (
    echo ❌ ERRO: Arquivo de migração não encontrado!
    echo.
    pause
    exit /b 1
)
echo ✅ Arquivo encontrado
echo.

echo Executando migração...
echo.

psql %DATABASE_URL% -f apps\backend\src\db\migrations\0014_editais_system.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ═══════════════════════════════════════════════════════════
    echo   ✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!
    echo ═══════════════════════════════════════════════════════════
    echo.
    echo PRÓXIMOS PASSOS:
    echo.
    echo 1. Inserir dados de exemplo (opcional):
    echo    psql %%DATABASE_URL%% -f apps\backend\src\db\seed-editais.sql
    echo.
    echo 2. Iniciar backend:
    echo    cd apps\backend
    echo    npm run dev
    echo.
    echo 3. Iniciar frontend:
    echo    cd apps\web
    echo    npm run dev
    echo.
    echo 4. Acessar: http://localhost:3000/admin/editais
    echo.
) else (
    echo.
    echo ❌ ERRO ao executar migração!
    echo.
    echo Verifique:
    echo   - DATABASE_URL configurada corretamente
    echo   - Conexão com o banco de dados
    echo   - Permissões do usuário
    echo.
)

echo.
pause
