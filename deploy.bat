@echo off
mkdir deployment
 
xcopy /E /I dist deployment\dist
 
xcopy /E /I node_modules deployment\node_modules
 
copy package.json deployment\
copy package-lock.json deployment\
 
cd deployment
7z a -r ..\lambda-deployment.zip .
cd .. 