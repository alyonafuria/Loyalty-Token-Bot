import asyncio
import json
import os
from datetime import datetime
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from database import Database

# Get the project root directory path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
JSON_FILE_PATH = os.path.join(PROJECT_ROOT, "completed_tokens.json")

bot = Bot(token='7618288840:AAEn3-G5JB1p42BICp0oVEUiC6oNcX41iBo')
dp = Dispatcher()
db = Database()

class TokenStates(StatesGroup):
    waiting_for_name = State()
    waiting_for_symbol = State()
    waiting_for_supply = State()
    waiting_for_recipient = State()

async def on_start():
    # Create a big pink start button
    start_kb = ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="🚀 START")]],  # Using emoji and caps for visibility
        resize_keyboard=True,
        is_persistent=True
    )
    return start_kb

@dp.message(F.text == "🚀 START")  # Handle the custom start button
async def handle_start_button(message: Message, state: FSMContext):
    await message.answer("Hello! Choose the name of your coin: ")
    await state.set_state(TokenStates.waiting_for_name)

@dp.message(Command("start"))
async def cmd_start(message: Message, state: FSMContext):
    # Show the start button immediately
    start_kb = await on_start()
    await message.answer(
        "Welcome to Token Creator Bot! 🎉\nPress 🚀 START to create your token!",
        reply_markup=start_kb
    )

@dp.message(StateFilter(TokenStates.waiting_for_name))
async def get_name(message: Message, state: FSMContext):
    await state.update_data(name=message.text)
    await message.answer("Choose your symbol: ")
    await state.set_state(TokenStates.waiting_for_symbol)

@dp.message(StateFilter(TokenStates.waiting_for_symbol))
async def get_symbol(message: Message, state: FSMContext):
    await state.update_data(symbol=message.text)
    await message.answer("Specify supply (tokens amount)")
    await state.set_state(TokenStates.waiting_for_supply)

@dp.message(StateFilter(TokenStates.waiting_for_supply))
async def get_supply(message: Message, state: FSMContext):
    await state.update_data(supply=message.text)
    await message.answer("Type your wallet address: ")
    await state.set_state(TokenStates.waiting_for_recipient)

@dp.message(StateFilter(TokenStates.waiting_for_recipient))
async def get_recipient(message: Message, state: FSMContext):
    await state.update_data(recipient=message.text)
    data = await state.get_data()
    
    # Store the response in database
    db.store_token_response(
        user_id=message.from_user.id,
        username=message.from_user.username,
        token_data=data
    )
    
    # Create a complete token entry JSON
    token_entry = {
        "timestamp": datetime.now().isoformat(),
        "user_id": message.from_user.id,
        "username": message.from_user.username,
        "token_data": {
            "name": data['name'],
            "symbol": data['symbol'],
            "supply": data['supply'],
            "recipient": data['recipient']
        }
    }
    
    # Save complete token entry to project root directory
    try:
        if os.path.exists(JSON_FILE_PATH):
            with open(JSON_FILE_PATH, 'r') as f:
                tokens = json.load(f)
        else:
            tokens = []
    except (FileNotFoundError, json.JSONDecodeError):
        tokens = []
    
    tokens.append(token_entry)
    
    with open(JSON_FILE_PATH, 'w') as f:
        json.dump(tokens, f, indent=4)

    # Show the start button with the completion message
    start_kb = await on_start()
    
    # Count how many tokens are ahead in queue
    try:
        with open(JSON_FILE_PATH, 'r') as f:
            all_tokens = json.load(f)
            queue_position = len([t for t in all_tokens if t['timestamp'] < token_entry['timestamp']])
    except:
        queue_position = 0
    
    await message.answer(
        f"✨ Token request submitted!\n\n"
        f"Token name: {data['name']}\n"
        f"Token symbol: {data['symbol']}\n"
        f"Token supply: {data['supply']}\n"
        f"Recipient address: {data['recipient']}\n\n"
        f"Queue position: #{queue_position + 1}\n"
        f"Estimated wait time: {queue_position * 2} minutes\n\n"
        f"You will receive another message when your token is deployed with the contract address.\n\n"
        f"Press 🚀 START to create another token!",
        reply_markup=start_kb
    )
    await state.clear()

@dp.message(Command("view_tokens"))
async def view_tokens(message: Message):
    """Handler to view all completed tokens"""
    try:
        with open(JSON_FILE_PATH, 'r') as f:
            tokens = json.load(f)
        # Show the start button with the view message
        start_kb = await on_start()
        await message.answer(
            f"Total tokens created: {len(tokens)}\n"
            f"Press 🚀 START to create another token!",
            reply_markup=start_kb
        )
    except FileNotFoundError:
        start_kb = await on_start()
        await message.answer(
            "No tokens created yet\n"
            "Press 🚀 START to create your first token!",
            reply_markup=start_kb
        )

@dp.message(Command("cancel"))
async def cancel(message: Message, state: FSMContext):
    await state.clear()
    # Show the start button with the cancel message
    start_kb = await on_start()
    await message.answer(
        "Operation cancelled. Press 🚀 START to create a new token.",
        reply_markup=start_kb
    )

async def check_deployment_status():
    """Check deployment_result.json for new deployments and notify users"""
    while True:
        try:
            if os.path.exists(os.path.join(PROJECT_ROOT, "..", "deployment_result.json")):
                with open(os.path.join(PROJECT_ROOT, "..", "deployment_result.json"), 'r') as f:
                    result = json.load(f)
                    if result['status'] == 'success':
                        message = (
                            f"🎉 Your token has been deployed successfully!\n\n"
                            f"Token Name: {result['tokenName']}\n"
                            f"Token Symbol: {result['tokenSymbol']}\n"
                            f"Contract Address: {result['contractAddress']}\n"
                            f"Transaction Hash: {result['transactionHash']}\n\n"
                            f"✨ You can now import this token in your wallet using the contract address."
                        )
                        await bot.send_message(result['userId'], message)
                        # Remove the result file after sending notification
                        os.remove(os.path.join(PROJECT_ROOT, "..", "deployment_result.json"))
        except Exception as e:
            print(f"Error checking deployment status: {e}")
        await asyncio.sleep(5)  # Check every 5 seconds

async def main():
    try:
        # Start the deployment status checker
        asyncio.create_task(check_deployment_status())
        # Start the bot
        await dp.start_polling(bot, skip_updates=True)
    finally:
        await bot.session.close()

if __name__ == '__main__':
    asyncio.run(main())
