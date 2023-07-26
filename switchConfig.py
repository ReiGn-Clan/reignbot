import os
import re

def switch_config_references(directory_path, from_config, to_config):
    for root, _, files in os.walk(directory_path):
        # Check if the current directory is "node_modules" and skip it
        if os.path.basename(root) == "node_modules":
            continue

        relative_path = os.path.relpath(root, start=directory_path)

        # Determine the relative path prefix based on the directory location
        if relative_path.startswith("commands"):
            relative_prefix = "../"
            print("In commands!")
        elif relative_path.startswith(os.path.join("src", "modules")):
            relative_prefix = "../../"
            print("In src/modules/!")
        elif relative_path == ".":
            relative_prefix = "./"
            print("In /bot/!")
        else:
            continue  # Skip directories other than bot, commands, and src/modules

        for file in files:
            if file.endswith(".js"):
                filepath = os.path.join(root, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                # Use a different approach to find and replace require statements
                updated_content = re.sub(rf"require\s*\(\s*['\"](?:\.\./)*{re.escape(from_config)}['\"]\s*\)", f"require('{relative_prefix}{to_config}')", content)

                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(updated_content)

        # Handle the special case for the "/bot/" directory and its files
        if relative_path == "." and os.path.basename(root) == "bot":
            bot_directory = root
            for bot_file in ["bot.js", "deploy-commands.js"]:
                bot_filepath = os.path.join(bot_directory, bot_file)
                with open(bot_filepath, "r", encoding="utf-8") as f:
                    bot_content = f.read()

                # Use a different approach to find and replace require statements in bot.js and deploy-commands.js
                updated_bot_content = re.sub(rf"require\s*\(\s*['\"](?:[./]*){re.escape(from_config)}['\"]\s*\)", f"require('{to_config}')", bot_content)

                with open(bot_filepath, "w", encoding="utf-8") as f:
                    f.write(updated_bot_content)

if __name__ == "__main__":
    # Set the current script's directory as the directory_path
    directory_path = os.path.dirname(os.path.abspath(__file__))
    from_config_file = "dev_config.json" #<-- current config
    to_config_file = "prod_config.json" #<-- config you want to switch to

    switch_config_references(directory_path, from_config_file, to_config_file)
    print("Configuration references switched successfully.")
