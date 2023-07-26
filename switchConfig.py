import os
import re
import argparse

def switch_configs(directory_path, from_config, to_config):
    for root, _, files in os.walk(directory_path):
        # Check if the current directory is "node_modules" and skip it
        if os.path.basename(root) == "node_modules":
            continue

        relative_path = os.path.relpath(root, start=directory_path)

        # Determine the relative path prefix based on the directory location
        if relative_path.startswith("commands"):
            relative_prefix = "../"
        elif relative_path.startswith(os.path.join("src", "modules")):
            relative_prefix = "../../"
        elif relative_path.startswith('.'):
            relative_prefix = "./"
        else:
            continue  # Skip directories other than bot, commands, and src/modules

        for file in files:
            if file.endswith(".js"):
                filepath = os.path.join(root, file)
                print ("Traversed " + filepath)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                # Use a different approach to find and replace require statements
                updated_content = re.sub(rf"require\s*\(\s*['\"](?:\.\./)*{re.escape(from_config)}['\"]\s*\)", f"require('{relative_prefix}{to_config}')", content)

                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(updated_content)

        # Handle the special case for the "/bot/" directory and its files
        if relative_path == "." and os.path.basename(root) == "bot":
            bot_directory = root
            relative_prefix = './'
            for bot_file in ["bot.js", "deploy-commands.js"]:
                bot_filepath = os.path.join(bot_directory, bot_file)
                with open(bot_filepath, "r", encoding="utf-8") as f:
                    bot_content = f.read()

                # Use a different approach to find and replace require statements in bot.js and deploy-commands.js
                updated_bot_content = re.sub(rf"require\s*\(\s*['\"](?:[./]*){re.escape(from_config)}['\"]\s*\)", f"require('{relative_prefix}{to_config}')", bot_content)

                with open(bot_filepath, "w", encoding="utf-8") as f:
                    f.write(updated_bot_content)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Switch configs to change environments")
    parser.add_argument("from_config", help="The name of the current config")
    parser.add_argument("to_config", help="The name of the target config")
    args = parser.parse_args()

    directory_path = os.path.dirname(os.path.abspath(__file__))# Set the current script's directory as the directory_path

    from_config = args.from_config #<-- current config
    to_config = args.to_config #<-- config you want to switch to

    switch_configs(directory_path, from_config, to_config)
    print("Configs switched successfully.")
