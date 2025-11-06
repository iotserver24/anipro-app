@ECHO OFF

SET DIRNAME=%~dp0
IF "%DIRNAME%" == "" SET DIRNAME=.
SET APP_BASE_NAME=%~n0
SET APP_HOME=%DIRNAME%

SET CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar

SET JAVA_EXE=%JAVA_HOME%\bin\java.exe
"%JAVA_EXE%" %JAVA_OPTS% -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
