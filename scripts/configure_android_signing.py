from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
if 'halo-deck-upload.jks' in text:
    raise SystemExit('Android signing is already configured')

imports = 'import java.io.FileInputStream\nimport java.util.Properties\n\n'
properties = 'val keystoreProperties = Properties()\nval keystorePropertiesFile = rootProject.file("key.properties")\nif (keystorePropertiesFile.exists()) {\n    keystoreProperties.load(FileInputStream(keystorePropertiesFile))\n}\n\n'
if not text.startswith('import java.io.FileInputStream'):
    text = imports + text
text = text.replace('}\n\nandroid {', f'}}\n\n{properties}android {{', 1)
signing = '''    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }
'''
text = text.replace('android {\n', 'android {\n' + signing, 1)
if 'signingConfig = signingConfigs.getByName("debug")' in text:
    text = text.replace('signingConfig = signingConfigs.getByName("debug")', 'signingConfig = signingConfigs.getByName("release")', 1)
else:
    text = text.replace('buildTypes {\n', 'buildTypes {\n        getByName("release") { signingConfig = signingConfigs.getByName("release") }\n', 1)
path.write_text(text, encoding='utf-8')
