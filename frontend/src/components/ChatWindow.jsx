const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || loadingAnswer) return;

    // 1. Format the current React messages into the schema FastAPI expects
    const apiHistory = messages.map((msg) => ({
      role: msg.sender, // 'user' or 'ai'
      content: msg.text
    }));

    const userMessage = { sender: 'user', text: inputQuery };
    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setLoadingAnswer(true);

    try {
      // 2. Pass the mapped history into the API request!
      const result = await askQuestion(inputQuery, apiHistory);
      const aiMessage = {
        sender: 'ai',
        text: result.answer,
        citations: result.citations,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        sender: 'ai',
        text: 'Sorry, I encountered an error retrieving an answer from your documents.',
        citations: [],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoadingAnswer(false);
    }
  };