-- Candy Crush and Tetris for Game City
alter table public.game_rooms drop constraint if exists game_rooms_game_check;
alter table public.game_rooms add constraint game_rooms_game_check check (game in ('ludo', 'chess', 'dominoes', 'pool', 'word', 'trivia', 'connect4', 'battleship', 'checkers', 'snakes', 'snake', 'memory', 'candy', 'tetris'));
alter table public.game_results drop constraint if exists game_results_game_check;
alter table public.game_results add constraint game_results_game_check check (game in ('ludo', 'chess', 'dominoes', 'pool', 'word', 'trivia', 'connect4', 'battleship', 'checkers', 'snakes', 'snake', 'memory', 'candy', 'tetris'));
