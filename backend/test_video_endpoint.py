import requests

response = requests.get('http://localhost:8000/api/aulas/video/aula_3_video_1771798298295.mp4')
print(f'Status: {response.status_code}')
if response.status_code == 200:
    print(f'Content-Type: {response.headers.get("content-type")}')
    print(f'Content-Length: {response.headers.get("content-length")} bytes')
    print('✅ Endpoint de vídeo funcionando!')
else:
    print(f'❌ Erro: {response.text}')